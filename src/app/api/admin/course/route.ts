import { z } from "zod";
import { Prisma } from "@/src/generated/prisma/client";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { assertCourseManageable } from "@/lib/course-access";
import { assertCurriculumManageable } from "@/lib/content-access";

const COURSE_TYPES = ["ONLINE", "OFFLINE", "VIDEO"] as const;
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
const DURATION_UNITS = ["SECOND", "MINUTE", "HOUR", "DAY", "WEEK", "MONTH", "YEAR"] as const;
const VIDEO_PROVIDERS = ["VIMEO", "YOUTUBE", "GOOGLE_DRIVE", "UPLOAD"] as const;
const UNIT_TYPES = ["VIDEO", "LIVE", "TEXT"] as const;
const INSTRUCTOR_ROLES = ["LEAD", "SUPPORT"] as const;

const optStr = z.string().trim().optional().or(z.literal(""));
const pct = z.coerce.number().int().min(0).max(100).optional();

// { title, answer } pair used by aboutCourse + faqQuestions
const qaItem = z.object({
  title: z.string().trim().min(1),
  answer: z.string().trim().optional().default(""),
});

const instructorItem = z.object({
  userId: z.string().min(1),
  category: z.enum(INSTRUCTOR_ROLES).default("LEAD"),
});

// A curriculum item is one of: a new unit (content copied in), or a reference to
// an existing quiz / assignment. Ordered within the section as authored.
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
  title: z.string().trim().min(2, "Title is required.").max(200),
  shortTitle: optStr,
  description: optStr,
  categoryId: optStr,
  authorId: optStr,
  type: z.enum(COURSE_TYPES).default("VIDEO"),
  status: z.enum(STATUSES).default("DRAFT"),
  level: z.enum(LEVELS).default("BEGINNER"),
  language: z.string().trim().min(1).max(10).default("bn"),
  thumbnailUrl: optStr,
  videoProvider: z.enum(VIDEO_PROVIDERS).optional().or(z.literal("")),
  previewVideoUrl: optStr,
  startDate: optStr,
  duration: z.coerce.number().int().min(0).optional(),
  durationUnit: z.enum(DURATION_UNITS).optional().or(z.literal("")),
  maximumStudents: z.coerce.number().int().min(0).optional(),
  // Prices supplied in taka; stored as paisa.
  regularPrice: z.coerce.number().min(0).default(0),
  sellPrice: z.coerce.number().min(0).default(0),
  isFree: z.coerce.boolean().default(false),
  autoEvaluation: z.coerce.boolean().default(false),
  unitCompletionLock: z.coerce.boolean().default(false),

  // Repeatable content
  whatWillBeTaught: z.array(z.string().trim().min(1)).default([]),
  aboutCourse: z.array(qaItem).default([]),
  faqQuestions: z.array(qaItem).default([]),
  instructors: z.array(instructorItem).default([]),
  curriculum: z.array(curriculumSection).default([]),

  // Accessibility & media
  badgePercentage: pct,
  certificatePassingPercentage: pct,
  badgeTitle: optStr,
  badgeImageUrl: optStr,
  certificateTemplateId: optStr,
  completionCertificate: z.coerce.boolean().default(false),
  prerequisiteCourseId: optStr,
  courseRetakes: z.coerce.number().int().min(0).optional(),
  hideExpiredBatches: z.coerce.boolean().default(false),
});

const schema = z.discriminatedUnion("action", [
  fields.extend({ action: z.literal("create") }),
  fields.extend({ action: z.literal("update"), id: z.string().min(1) }),
  z.object({ action: z.literal("delete"), id: z.string().min(1) }),
]);

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || "course";
  const existing = await prisma.course.findUnique({ where: { slug }, select: { id: true } });
  if (existing && existing.id !== excludeId) slug = `${slug}-${Date.now().toString(36)}`;
  return slug;
}

type Fields = z.infer<typeof fields>;

/** Scalar / Json columns shared by create + update. */
function scalarPayload(data: Fields) {
  return {
    title: data.title,
    shortTitle: data.shortTitle || null,
    description: data.description || null,
    categoryId: data.categoryId || null,
    type: data.type,
    status: data.status,
    level: data.level,
    language: data.language,
    thumbnailUrl: data.thumbnailUrl || null,
    videoProvider: data.videoProvider || null,
    previewVideoUrl: data.previewVideoUrl || null,
    startDate: data.startDate ? new Date(data.startDate) : null,
    duration: data.duration ?? null,
    durationUnit: data.durationUnit || null,
    maximumStudents: data.maximumStudents ?? null,
    regularPrice: Math.round(data.regularPrice * 100),
    sellPrice: Math.round(data.sellPrice * 100),
    isFree: data.isFree,
    autoEvaluation: data.autoEvaluation,
    unitCompletionLock: data.unitCompletionLock,
    whatWillLearn: data.whatWillBeTaught,
    aboutFaq: data.aboutCourse,
    faq: data.faqQuestions,
    badgePercentage: data.badgePercentage ?? null,
    certificatePassingPercent: data.certificatePassingPercentage ?? null,
    badgeTitle: data.badgeTitle || null,
    badgeImageUrl: data.badgeImageUrl || null,
    certificateTemplateId: data.certificateTemplateId || null,
    completionCertificate: data.completionCertificate,
    prerequisiteCourseId: data.prerequisiteCourseId || null,
    courseRetakes: data.courseRetakes ?? 1,
    hideExpiredBatches: data.hideExpiredBatches,
  };
}

/**
 * Persist the curriculum builder's ordered sections + items. Units are created
 * (content copied) and owned by the section; quizzes/assignments are referenced
 * by id. Every item is recorded as an ordered SectionItem.
 */
async function createCurriculum(
  tx: Prisma.TransactionClient,
  courseId: string,
  sections: Fields["curriculum"]
) {
  for (const [sIdx, section] of sections.entries()) {
    if (!section.title.trim()) continue;
    const created = await tx.section.create({
      data: { title: section.title.trim(), order: sIdx, courseId },
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
  if (data.action !== "create") await assertCourseManageable(data.id, user);

  if (data.action === "delete") {
    await prisma.course.update({ where: { id: data.id }, data: { deletedAt: new Date() } });
    return ok({ deleted: true });
  }

  if (data.categoryId) {
    const cat = await prisma.courseCategory.findUnique({ where: { id: data.categoryId }, select: { id: true } });
    if (!cat) return fail("Category not found.");
  }
  await assertCurriculumManageable(data.curriculum, user);

  // Quizzes and assignments are one-to-one with a SectionItem (unique columns),
  // so a quiz/assignment already placed in another section can't be reused here.
  // Catch it up front and return a readable message instead of a raw 500.
  if (data.action === "create" || data.action === "update") {
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
  }

  const payload = scalarPayload(data);
  const authorId = user.role === "INSTRUCTOR" ? user.id : data.authorId || user.id;
  const instructorRows = data.instructors.map((i, idx) => ({
    userId: i.userId,
    category: i.category,
    order: idx,
  }));

  if (data.action === "create") {
    const slug = await uniqueSlug(data.title);
    const course = await prisma.$transaction(async (tx) => {
      const created = await tx.course.create({
        data: {
          ...payload,
          slug,
          authorId,
          instructors: { create: instructorRows },
        },
      });
      await createCurriculum(tx, created.id, data.curriculum);
      return created;
    });
    return ok({ course });
  }

  // Update: refresh scalars + instructors (replace). Curriculum is left to the
  // Section/Unit managers so existing units & student progress aren't destroyed.
  const course = await prisma.$transaction(async (tx) => {
    await tx.courseInstructor.deleteMany({ where: { courseId: data.id } });
    return tx.course.update({
      where: { id: data.id },
      data: {
        ...payload,
        authorId,
        instructors: { create: instructorRows },
      },
    });
  });
  return ok({ course });
});
