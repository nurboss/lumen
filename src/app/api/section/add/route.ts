import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { assertCourseManageable } from "@/lib/course-access";
import prisma from "@/lib/prisma";

const schema = z.object({ courseId: z.string().min(1), title: z.string().trim().min(1).max(200) });

export const POST = handler(async (req: Request) => {
  const user = await requireRole("ADMIN", "INSTRUCTOR", "AGENT");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId, title } = parsed.data;

  await assertCourseManageable(courseId, user);

  const last = await prisma.section.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const section = await prisma.section.create({
    data: { courseId, title, order: (last?.order ?? -1) + 1 },
  });
  return ok({ section });
});
