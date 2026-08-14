import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { assertCourseManageable, sectionCourseId } from "@/lib/course-access";
import prisma from "@/lib/prisma";

const schema = z.object({ id: z.string().min(1), title: z.string().trim().min(1).max(200) });

export const POST = handler(async (req: Request) => {
  const user = await requireRole("ADMIN", "INSTRUCTOR", "AGENT");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { id, title } = parsed.data;

  await assertCourseManageable(await sectionCourseId(id), user);
  const section = await prisma.section.update({ where: { id }, data: { title } });
  return ok({ section });
});
