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

// A section's curriculum entry: a playable unit, or a link to a quiz/assignment.
export type PlayerItem =
  | ({ kind: "unit" } & PlayerUnit)
  | { kind: "quiz"; id: string; title: string }
  | { kind: "assignment"; id: string; title: string };

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
              quiz: { select: { id: true, title: true } },
              assignment: { select: { id: true, title: true } },
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

  let priorAllComplete = true;
  let totalUnits = 0;

  const sections: PlayerSection[] = course.sections.map((section, si) => ({
    id: section.id,
    title: section.title,
    order: section.order,
    items: section.items.map((item): PlayerItem => {
      if (item.kind === "QUIZ" && item.quiz) {
        return { kind: "quiz", id: item.quiz.id, title: item.quiz.title };
      }
      if (item.kind === "ASSIGNMENT" && item.assignment) {
        return { kind: "assignment", id: item.assignment.id, title: item.assignment.title };
      }
      // UNIT (fallback also covers orphaned refs, filtered below)
      const unit = item.unit!;
      totalUnits += 1;
      const p = progressByUnit.get(unit.id);
      const completed = p?.completed ?? false;

      let locked: boolean;
      if (!enrolled) {
        locked = !(unit.isFree || (course.firstSectionFree && si === 0));
      } else if (course.unitCompletionLock) {
        locked = !priorAllComplete && !unit.isFree;
      } else {
        locked = false;
      }

      // Update running "all prior complete" state for the lock computation.
      if (!completed) priorAllComplete = false;

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
    }).filter((it) => it.kind !== "unit" || it.id),
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
