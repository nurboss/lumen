import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { assertCourseManageable, sectionCourseId } from "@/lib/course-access";
import prisma from "@/lib/prisma";

const schema = z.object({ id: z.string().min(1) });

export const POST = handler(async (req: Request) => {
  const user = await requireRole("ADMIN", "INSTRUCTOR", "AGENT");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  await assertCourseManageable(await sectionCourseId(parsed.data.id), user);
  await prisma.section.delete({ where: { id: parsed.data.id } });
  return ok({ deleted: true });
});
