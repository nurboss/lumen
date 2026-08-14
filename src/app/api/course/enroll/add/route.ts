import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, AuthError } from "@/lib/auth";
import prisma from "@/lib/prisma";

const schema = z.object({
  courseId: z.string().min(1),
  batchId: z.string().optional(),
});

export const POST = handler(async (req: Request) => {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, e.status);
    throw e;
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId, batchId } = parsed.data;

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null, status: "PUBLISHED" },
  });
  if (!course) return fail("Course not found.", 404);

  // Prerequisite gate (server-enforced).
  if (course.prerequisiteCourseId) {
    const prereqDone = await prisma.enrollment.findFirst({
      where: {
        userId: user.id,
        courseId: course.prerequisiteCourseId,
        status: "COMPLETED",
      },
    });
    if (!prereqDone) {
      return fail("You must complete the prerequisite course first.", 403);
    }
  }

  const existing = await prisma.enrollment.findFirst({
    where: { userId: user.id, courseId },
  });
  if (existing) return ok({ enrollmentId: existing.id, alreadyEnrolled: true });

  // No payment gateway in this build: free & paid courses enroll directly.
  const enrollment = await prisma.enrollment.create({
    data: {
      userId: user.id,
      courseId,
      batchId: batchId ?? null,
      type: course.isFree ? "FREE" : "PAYMENT",
      status: "ACTIVE",
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "ENROLLMENT",
      title: "Enrolled successfully",
      body: `You are now enrolled in "${course.title}".`,
      link: `/student/my-course/${courseId}`,
    },
  });

  return ok({ enrollmentId: enrollment.id });
});
