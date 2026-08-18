import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), name: z.string().trim().min(2).max(60) }),
  z.object({ action: z.literal("update"), id: z.string().min(1), name: z.string().trim().min(2).max(60) }),
  z.object({ action: z.literal("delete"), id: z.string().min(1) }),
]);

export const POST = handler(async (req: Request) => {
  await requireRole("ADMIN");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;

  if (data.action === "create") {
    if (await prisma.questionTag.findUnique({ where: { name: data.name } })) {
      return fail("A tag with this name already exists.");
    }
    const tag = await prisma.questionTag.create({ data: { name: data.name } });
    return ok({ tag });
  }

  if (data.action === "update") {
    const clash = await prisma.questionTag.findUnique({ where: { name: data.name } });
    if (clash && clash.id !== data.id) return fail("A tag with this name already exists.");
    const tag = await prisma.questionTag.update({ where: { id: data.id }, data: { name: data.name } });
    return ok({ tag });
  }

  await prisma.questionTag.delete({ where: { id: data.id } });
  return ok({ deleted: true });
});
