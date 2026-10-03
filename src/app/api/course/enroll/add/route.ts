import { z } from "zod";
import { Prisma } from "@/src/generated/prisma/client";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, AuthError } from "@/lib/auth";
import prisma from "@/lib/prisma";

const schema = z.object({
  courseId: z.string().min(1),
  batchId: z.string().min(1).optional(),
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  if (user.status !== "ACTIVE") return fail("Your account must be active to enroll.", 403);

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId, batchId } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    // Serialize enrollment in a course so duplicate requests and competing
    // students cannot claim the last batch seat simultaneously.
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Course" WHERE "id" = ${courseId} FOR UPDATE`);
    const course = await tx.course.findFirst({
      where: { id: courseId, deletedAt: null, status: "PUBLISHED" },
    });
    if (!course) throw new AuthError("Course not found.", 404);
    if (course.forceBatchEnrollment && !batchId) throw new AuthError("Choose a batch to enroll in this course.", 400);

    if (course.prerequisiteCourseId) {
      const prerequisite = await tx.enrollment.findFirst({
        where: { userId: user.id, courseId: course.prerequisiteCourseId, status: "COMPLETED" },
      });
      if (!prerequisite) throw new AuthError("You must complete the prerequisite course first.", 403);
    }

    const batch = batchId ? await tx.batch.findFirst({ where: { id: batchId, courseId, deletedAt: null } }) : null;
    if (batchId && !batch) throw new AuthError("Batch not found for this course.", 404);

    // An enrollment in another batch does not satisfy the selected batch.
    const existing = await tx.enrollment.findFirst({
      where: { userId: user.id, courseId, ...(batchId ? { batchId } : { status: { in: ["ACTIVE", "COMPLETED"] } }) },
    });
    if (existing && (existing.status === "ACTIVE" || existing.status === "COMPLETED")) {
      return { enrollmentId: existing.id, batchId: existing.batchId, alreadyEnrolled: true };
    }

    if (batch) {
      if (batch.endDate && batch.endDate < new Date()) throw new AuthError("This batch has ended.", 400);
      if (batch.seats !== null) {
        const occupied = await tx.enrollment.count({ where: { batchId: batch.id, status: { in: ["ACTIVE", "COMPLETED"] } } });
        if (occupied >= batch.seats) throw new AuthError("This batch is full.", 409);
      }
    }

    // Attach a course-only enrollment to the chosen batch and retain progress.
    const courseOnly = batchId && !existing ? await tx.enrollment.findFirst({
      where: { userId: user.id, courseId, batchId: null, status: { in: ["ACTIVE", "COMPLETED"] } },
    }) : null;
    const enrollment = existing
      ? await tx.enrollment.update({ where: { id: existing.id }, data: { status: "ACTIVE", completedAt: null } })
      : courseOnly
        ? await tx.enrollment.update({ where: { id: courseOnly.id }, data: { batchId } })
        : await tx.enrollment.create({
          data: { userId: user.id, courseId, batchId: batchId ?? null, type: course.isFree ? "FREE" : "PAYMENT", status: "ACTIVE" },
        });
    await tx.notification.create({
      data: {
        userId: user.id,
        type: "ENROLLMENT",
        title: "Enrolled successfully",
        body: `You are now enrolled in "${course.title}"${batch ? ` (${batch.name || "Course batch"})` : ""}.`,
        link: batch ? "/student/my-batch" : `/student/my-course/${courseId}`,
      },
    });
    return { enrollmentId: enrollment.id, batchId: enrollment.batchId };
  });
  return ok(result);
});
