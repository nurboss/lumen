import "server-only";
import prisma from "@/lib/prisma";
import { issueCertificateIfEligible } from "@/lib/certificates";

export interface PlayerUnit {
  id: string;
  title: string;
  order: number;
  type: string;
  isFree: boolean;
  publicVideoUrl: string | null;
  storageVideoUrl: string | null;
  attachmentUrl: string | null;
  description: string | null;
  duration: number | null;
  completed: boolean;
  lastPositionSeconds: number;
  locked: boolean;
}

export interface PlayerQuizQuestion {
  id: string;
  text: string;
  type: string;
  options: { id: string; text: string }[];
  marks: number;
}

export interface PlayerQuiz {
  id: string;
  title: string;
  durationMinutes: number | null;
  passingMarks: number | null;
  questions: PlayerQuizQuestion[];
  completed: boolean;
  passed: boolean;
  score: number | null;
  locked: boolean;
}

export interface PlayerAssignment {
  id: string;
  title: string;
  description: string | null;
  submissionType: string;
  maximumMarks: number;
  completed: boolean;
  locked: boolean;
}

// A section's curriculum entry, rendered inline in the player queue: a playable
// unit, a quiz, or an assignment. Every kind carries its own completion/lock
// state so the player can gate them in one ordered sequence.
export type PlayerItem =
  | ({ kind: "unit" } & PlayerUnit)
  | ({ kind: "quiz" } & PlayerQuiz)
  | ({ kind: "assignment" } & PlayerAssignment);

export interface PlayerSection {
  id: string;
  title: string;
  order: number;
  items: PlayerItem[];
}

export interface PlayerData {
  course: {
    id: string;
    title: string;
    unitCompletionLock: boolean;
    firstSectionFree: boolean;
  };
  enrolled: boolean;
  progressPercent: number;
  sections: PlayerSection[];
  totalUnits: number;
  completedUnits: number;
  totalItems: number;
  completedItems: number;
}

/**
 * Loads a course's curriculum for a given user, applying server-side gates:
 *  - Non-enrolled users only unlock free units (+ first-section units if
 *    firstSectionFree) — everything else is locked.
 *  - When `unitCompletionLock` is on, a unit unlocks only after every prior
 *    unit (across the ordered curriculum) is completed.
 */
export async function getPlayerData(
  courseId: string,
  userId: string | null
): Promise<PlayerData | null> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      unitCompletionLock: true,
      firstSectionFree: true,
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          items: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              kind: true,
              order: true,
              unit: {
                select: {
                  id: true,
                  title: true,
                  order: true,
                  type: true,
                  isFree: true,
                  publicVideoUrl: true,
                  storageVideoUrl: true,
                  attachmentUrl: true,
                  description: true,
                  duration: true,
                },
              },
              quiz: {
                select: {
                  id: true,
                  title: true,
                  durationMinutes: true,
                  passingMarks: true,
                  questions: {
                    orderBy: { order: "asc" },
                    select: {
                      question: {
                        select: { id: true, text: true, type: true, options: true, marks: true },
                      },
                    },
                  },
                },
              },
              assignment: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  submissionType: true,
                  maximumMarks: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!course || course.status !== "PUBLISHED") return null;

  const enrollment = userId
    ? await prisma.enrollment.findFirst({
        where: { userId, courseId },
        select: { id: true, progressPercent: true },
      })
    : null;
  const enrolled = Boolean(enrollment);

  const progressRows = userId
    ? await prisma.unitProgress.findMany({
        where: { userId, unit: { section: { courseId } } },
        select: { unitId: true, completed: true, lastPositionSeconds: true },
      })
    : [];
  const progressByUnit = new Map(progressRows.map((p) => [p.unitId, p]));

  // Quiz + assignment completion state for the same user, so all curriculum
  // kinds can be gated in one ordered queue.
  const quizIds = course.sections.flatMap((s) =>
    s.items.map((i) => i.quiz?.id).filter((x): x is string => Boolean(x))
  );
  const assignmentIds = course.sections.flatMap((s) =>
    s.items.map((i) => i.assignment?.id).filter((x): x is string => Boolean(x))
  );

  const quizResults = userId && quizIds.length
    ? await prisma.quizResult.findMany({
        where: { userId, quizId: { in: quizIds } },
        orderBy: { submittedAt: "desc" },
        select: { quizId: true, passed: true, score: true },
      })
    : [];
  const quizStateById = new Map<string, { passed: boolean; score: number }>();
  for (const r of quizResults) {
    const cur = quizStateById.get(r.quizId);
    // Keep the best attempt (passed wins, else highest score).
    if (!cur || (r.passed && !cur.passed) || r.score > cur.score) {
      quizStateById.set(r.quizId, { passed: r.passed, score: r.score });
    }
  }

  const submittedAssignments = userId && assignmentIds.length
    ? await prisma.assignmentSubmission.findMany({
        where: { userId, assignmentId: { in: assignmentIds } },
        select: { assignmentId: true },
      })
    : [];
  const submittedAssignmentIds = new Set(submittedAssignments.map((s) => s.assignmentId));

  // Strict sequential gating: an item unlocks only once every prior item in the
  // ordered curriculum (across all kinds) is complete. The first incomplete item
  // is the "frontier" — everything after it stays locked.
  let priorAllComplete = true;
  let totalUnits = 0;
  let totalItems = 0;
  let completedItems = 0;

  const sections: PlayerSection[] = course.sections.map((section) => ({
    id: section.id,
    title: section.title,
    order: section.order,
    items: section.items
      .map((item): PlayerItem | null => {
        const locked = enrolled ? !priorAllComplete : true;

        if (item.kind === "QUIZ" && item.quiz) {
          const state = quizStateById.get(item.quiz.id);
          const completed = Boolean(state);
          totalItems += 1;
          if (completed) completedItems += 1;
          else priorAllComplete = false;
          return {
            kind: "quiz",
            id: item.quiz.id,
            title: item.quiz.title,
            durationMinutes: item.quiz.durationMinutes,
            passingMarks: item.quiz.passingMarks,
            questions: item.quiz.questions.map((qq) => ({
              id: qq.question.id,
              text: qq.question.text,
              type: qq.question.type,
              options: (qq.question.options as { id: string; text: string }[] | null) ?? [],
              marks: qq.question.marks,
            })),
            completed,
            passed: state?.passed ?? false,
            score: state?.score ?? null,
            locked,
          };
        }

        if (item.kind === "ASSIGNMENT" && item.assignment) {
          const completed = submittedAssignmentIds.has(item.assignment.id);
          totalItems += 1;
          if (completed) completedItems += 1;
          else priorAllComplete = false;
          return {
            kind: "assignment",
            id: item.assignment.id,
            title: item.assignment.title,
            description: item.assignment.description,
            submissionType: item.assignment.submissionType,
            maximumMarks: item.assignment.maximumMarks,
            completed,
            locked,
          };
        }

        // UNIT (fallback also covers orphaned refs, filtered below)
        const unit = item.unit;
        if (!unit) return null;
        totalUnits += 1;
        totalItems += 1;
        const p = progressByUnit.get(unit.id);
        const completed = p?.completed ?? false;
        if (completed) completedItems += 1;
        else priorAllComplete = false;

        return {
          kind: "unit",
          id: unit.id,
          title: unit.title,
          order: unit.order,
          type: unit.type,
          isFree: unit.isFree,
          publicVideoUrl: unit.publicVideoUrl,
          storageVideoUrl: unit.storageVideoUrl,
          attachmentUrl: unit.attachmentUrl,
          description: unit.description,
          duration: unit.duration,
          completed,
          lastPositionSeconds: p?.lastPositionSeconds ?? 0,
          locked,
        };
      })
      .filter((it): it is PlayerItem => it !== null),
  }));

  const completedUnits = progressRows.filter((p) => p.completed).length;

  return {
    course: {
      id: course.id,
      title: course.title,
      unitCompletionLock: course.unitCompletionLock,
      firstSectionFree: course.firstSectionFree,
    },
    enrolled,
    progressPercent: enrollment?.progressPercent ?? 0,
    sections,
    totalUnits,
    completedUnits,
    totalItems,
    completedItems,
  };
}

/** Recompute + persist a course's progress percent for a user. */
export async function recomputeProgress(userId: string, courseId: string) {
  const totalUnits = await prisma.unit.count({
    where: { section: { courseId } },
  });
  const completedUnits = await prisma.unitProgress.count({
    where: { userId, completed: true, unit: { section: { courseId } } },
  });
  const percent = totalUnits === 0 ? 0 : (completedUnits / totalUnits) * 100;

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, courseId },
    select: { id: true },
  });
  if (!enrollment) return percent;

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      progressPercent: percent,
      ...(percent >= 100 ? { status: "COMPLETED", completedAt: new Date() } : {}),
    },
  });

  // On full completion, auto-issue the certificate (+badge) if configured.
  if (percent >= 100) {
    await issueCertificateIfEligible(userId, courseId);
  }
  return percent;
}
