import { z } from "zod";
import { Prisma } from "@/src/generated/prisma/client";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { assertCourseManageable } from "@/lib/course-access";
import { assertCurriculumManageable } from "@/lib/content-access";

const DAYS = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"] as const;
const UNIT_TYPES = ["VIDEO", "LIVE", "TEXT"] as const;
const DURATION_UNITS = ["SECOND", "MINUTE", "HOUR", "DAY", "WEEK", "MONTH", "YEAR"] as const;

const optStr = z.string().trim().optional().or(z.literal(""));

// A curriculum item is one of: a new unit (content copied in), or a reference to
// an existing quiz / assignment. Ordered within the section as authored. Mirrors
// the course curriculum builder.
const curriculumUnitItem = z.object({
  kind: z.literal("unit"),
  title: z.string().trim().min(1),
  type: z.enum(UNIT_TYPES).default("VIDEO"),
  description: optStr,
  isFree: z.coerce.boolean().default(false),
  duration: z.coerce.number().int().min(0).optional(),
  durationUnit: z.enum(DURATION_UNITS).optional().or(z.literal("")),
  publicVideoUrl: optStr,
  storageVideoUrl: optStr,
  attachmentUrl: optStr,
});

const curriculumItem = z.discriminatedUnion("kind", [
  curriculumUnitItem,
  z.object({ kind: z.literal("quiz"), refId: z.string().min(1) }),
  z.object({ kind: z.literal("assignment"), refId: z.string().min(1) }),
]);

const curriculumSection = z.object({
  title: z.string().trim().min(1),
  items: z.array(curriculumItem).default([]),
});

const fields = z.object({
  courseId: z.string().min(1, "Choose a course."),
  name: z.string().trim().max(200).optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  scheduleDays: z.array(z.enum(DAYS)).optional(),
  scheduleTime: z.string().trim().max(20).optional().or(z.literal("")),
  seats: z.coerce.number().int().min(0).optional(),
  dummyParticipants: z.coerce.number().int().min(0),
  curriculum: z.array(curriculumSection).default([]),
});

const schema = z.discriminatedUnion("action", [
  fields.extend({ action: z.literal("create") }),
  fields.extend({ action: z.literal("update"), id: z.string().min(1) }),
  z.object({ action: z.literal("delete"), id: z.string().min(1) }),
]);

type Fields = z.infer<typeof fields>;

/**
 * Persist the curriculum builder's ordered sections + items for a batch. Units are
 * created (content copied) and owned by the section; quizzes/assignments are
 * referenced by id. Every item is recorded as an ordered SectionItem.
 */
async function createCurriculum(
  tx: Prisma.TransactionClient,
  batchId: string,
  sections: Fields["curriculum"]
) {
  for (const [sIdx, section] of sections.entries()) {
    if (!section.title.trim()) continue;
    const created = await tx.section.create({
      data: { title: section.title.trim(), order: sIdx, batchId },
    });
    for (const [iIdx, item] of section.items.entries()) {
      if (item.kind === "unit") {
        const unit = await tx.unit.create({
          data: {
            sectionId: created.id,
            title: item.title,
            order: iIdx,
            type: item.type,
            description: item.description || null,
            isFree: item.isFree,
            duration: item.duration ?? null,
            durationUnit: item.durationUnit || null,
            publicVideoUrl: item.publicVideoUrl || null,
            storageVideoUrl: item.storageVideoUrl || null,
            attachmentUrl: item.attachmentUrl || null,
          },
        });
        await tx.sectionItem.create({
          data: { sectionId: created.id, order: iIdx, kind: "UNIT", unitId: unit.id },
        });
      } else if (item.kind === "quiz") {
        await tx.sectionItem.create({
          data: { sectionId: created.id, order: iIdx, kind: "QUIZ", quizId: item.refId },
        });
      } else {
        await tx.sectionItem.create({
          data: { sectionId: created.id, order: iIdx, kind: "ASSIGNMENT", assignmentId: item.refId },
        });
      }
    }
  }
}

export const POST = handler(async (req: Request) => {
  const user = await requireRole("ADMIN", "INSTRUCTOR");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;
  if (data.action !== "create") {
    const batch = await prisma.batch.findFirst({ where: { id: data.id, deletedAt: null }, select: { courseId: true } });
    if (!batch) return fail("Batch not found.", 404);
    await assertCourseManageable(batch.courseId, user);
  }

  if (data.action === "delete") {
    await prisma.batch.update({ where: { id: data.id }, data: { deletedAt: new Date() } });
    return ok({ deleted: true });
  }
  await assertCourseManageable(data.courseId, user);
  await assertCurriculumManageable(data.curriculum, user);

  const course = await prisma.course.findUnique({ where: { id: data.courseId }, select: { id: true } });
  if (!course) return fail("Course not found.");

  // Quizzes and assignments are one-to-one with a SectionItem (unique columns),
  // so a quiz/assignment already placed elsewhere can't be reused here. Catch it
  // up front and return a readable message instead of a raw 500.
  const quizIds = data.curriculum.flatMap((s) =>
    s.items.filter((i): i is { kind: "quiz"; refId: string } => i.kind === "quiz").map((i) => i.refId)
  );
  const assignmentIds = data.curriculum.flatMap((s) =>
    s.items.filter((i): i is { kind: "assignment"; refId: string } => i.kind === "assignment").map((i) => i.refId)
  );

  const dupQuiz = quizIds.find((id, i) => quizIds.indexOf(id) !== i);
  if (dupQuiz) return fail("The same quiz is used more than once in this curriculum.");
  const dupAssignment = assignmentIds.find((id, i) => assignmentIds.indexOf(id) !== i);
  if (dupAssignment) return fail("The same assignment is used more than once in this curriculum.");

  if (quizIds.length) {
    const taken = await prisma.sectionItem.findMany({
      where: { quizId: { in: quizIds } },
      select: { quiz: { select: { title: true } } },
    });
    if (taken.length) {
      const names = taken.map((t) => t.quiz?.title).filter(Boolean).join(", ");
      return fail(`This quiz is already attached to another course/section: ${names || "unknown"}. Each quiz can be used only once.`);
    }
  }
  if (assignmentIds.length) {
    const taken = await prisma.sectionItem.findMany({
      where: { assignmentId: { in: assignmentIds } },
      select: { assignment: { select: { title: true } } },
    });
    if (taken.length) {
      const names = taken.map((t) => t.assignment?.title).filter(Boolean).join(", ");
      return fail(`This assignment is already attached to another course/section: ${names || "unknown"}. Each assignment can be used only once.`);
    }
  }

  const payload = {
    courseId: data.courseId,
    name: data.name || null,
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    scheduleDays: data.scheduleDays ?? [],
    scheduleTime: data.scheduleTime || null,
    seats: data.seats ?? null,
    dummyParticipants: data.dummyParticipants,
  };

  if (data.action === "create") {
    const batch = await prisma.$transaction(async (tx) => {
      const created = await tx.batch.create({ data: { ...payload, createdById: user.id } });
      await createCurriculum(tx, created.id, data.curriculum);
      return created;
    });
    return ok({ batch });
  }

  // Update: refresh scalars only. Curriculum is left to the Section/Unit managers
  // so existing units & student progress aren't destroyed.
  const batch = await prisma.batch.update({ where: { id: data.id }, data: payload });
  return ok({ batch });
});
