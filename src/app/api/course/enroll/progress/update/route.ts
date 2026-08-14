import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireUser, AuthError } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { recomputeProgress } from "@/lib/curriculum";

const schema = z.object({
  unitId: z.string().min(1),
  lastPositionSeconds: z.number().int().min(0).optional(),
  secondsWatched: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
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
  const { unitId, lastPositionSeconds, secondsWatched, completed } = parsed.data;

  // Resolve unit → course and confirm the user is enrolled.
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { id: true, section: { select: { courseId: true, batchId: true } } },
  });
  const courseId = unit?.section.courseId;
  if (!unit || !courseId) return fail("Unit not found.", 404);

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id, courseId },
    select: { id: true },
  });
  if (!enrollment) return fail("You are not enrolled in this course.", 403);

  await prisma.unitProgress.upsert({
    where: { userId_unitId: { userId: user.id, unitId } },
    create: {
      userId: user.id,
      unitId,
      lastPositionSeconds: lastPositionSeconds ?? 0,
      secondsWatched: secondsWatched ?? 0,
      completed: completed ?? false,
    },
    update: {
      ...(lastPositionSeconds !== undefined ? { lastPositionSeconds } : {}),
      ...(secondsWatched !== undefined ? { secondsWatched } : {}),
      ...(completed !== undefined ? { completed } : {}),
    },
  });

  const progressPercent = await recomputeProgress(user.id, courseId);
  return ok({ progressPercent });
});
