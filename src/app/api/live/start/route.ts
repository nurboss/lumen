import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { assertCourseManageable, unitCourseId } from "@/lib/course-access";
import prisma from "@/lib/prisma";

const schema = z.object({ unitId: z.string().min(1) });

export const POST = handler(async (req: Request) => {
  const user = await requireRole("ADMIN", "INSTRUCTOR", "AGENT");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { unitId } = parsed.data;

  const courseId = await unitCourseId(unitId);
  await assertCourseManageable(courseId, user);

  const session = await prisma.liveSession.upsert({
    where: { unitId },
    create: { unitId, hostUserId: user.id, status: "STARTED", startedAt: new Date() },
    update: { hostUserId: user.id, status: "STARTED", startedAt: new Date(), endedAt: null },
  });

  await prisma.unit.update({
    where: { id: unitId },
    data: { classStatus: "STARTED", startedAt: new Date(), endedAt: null },
  });

  // Notify enrolled students the class has started.
  const students = await prisma.enrollment.findMany({
    where: { courseId, status: { in: ["ACTIVE", "COMPLETED"] } },
    select: { userId: true },
  });
  if (students.length) {
    await prisma.notification.createMany({
      data: students.map((s) => ({
        userId: s.userId,
        type: "CLASS_START" as const,
        title: "Live class started",
        body: "Your instructor has started a live class.",
        link: `/student/live-class`,
      })),
    });
  }

  return ok({ roomId: session.roomId, status: session.status });
});
