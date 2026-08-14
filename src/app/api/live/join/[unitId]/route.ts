import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { unitCourseId } from "@/lib/course-access";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Returns the room id for an active live session if the user may join
// (enrolled student or the host/manager).
export const GET = handler(async (_req: Request, ctx: { params: Promise<{ unitId: string }> }) => {
  const user = await requireUser();
  const { unitId } = await ctx.params;

  const session = await prisma.liveSession.findUnique({ where: { unitId } });
  if (!session) return fail("No live session for this lesson.", 404);
  if (session.status !== "STARTED") return fail("The class is not live right now.", 409);

  const courseId = await unitCourseId(unitId);

  const isHost = session.hostUserId === user.id || user.role === "ADMIN";
  const isEnrolled = Boolean(
    await prisma.enrollment.findFirst({ where: { userId: user.id, courseId } })
  );
  if (!isHost && !isEnrolled) return fail("You are not enrolled in this course.", 403);

  return ok({ roomId: session.roomId, isHost });
});
