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

  await assertCourseManageable(await unitCourseId(unitId), user);

  await prisma.liveSession.updateMany({
    where: { unitId },
    data: { status: "ENDED", endedAt: new Date() },
  });
  await prisma.unit.update({
    where: { id: unitId },
    data: { classStatus: "ENDED", endedAt: new Date() },
  });

  return ok({ status: "ENDED" });
});
