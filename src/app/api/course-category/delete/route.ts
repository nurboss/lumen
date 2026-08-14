import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

const schema = z.object({ id: z.string().min(1) });

export const POST = handler(async (req: Request) => {
  await requireRole("ADMIN");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const inUse = await prisma.course.count({ where: { categoryId: parsed.data.id } });
  if (inUse > 0) return fail(`Cannot delete: ${inUse} course(s) use this category.`);

  await prisma.courseCategory.delete({ where: { id: parsed.data.id } });
  return ok({ deleted: true });
});
