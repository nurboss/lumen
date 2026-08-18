import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

const fields = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(200),
  order: z.coerce.number().int().min(0),
  parentType: z.enum(["course", "batch"]),
  parentId: z.string().min(1, "Choose a course or batch."),
  quizId: z.string().optional().or(z.literal("")),
  assignmentId: z.string().optional().or(z.literal("")),
});

const schema = z.discriminatedUnion("action", [
  fields.extend({ action: z.literal("create") }),
  fields.extend({ action: z.literal("update"), id: z.string().min(1) }),
  z.object({ action: z.literal("delete"), id: z.string().min(1) }),
]);

export const POST = handler(async (req: Request) => {
  await requireRole("ADMIN");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;

  if (data.action === "delete") {
    await prisma.section.delete({ where: { id: data.id } });
    return ok({ deleted: true });
  }

  const quizId = data.quizId || null;
  const assignmentId = data.assignmentId || null;
  const currentId = data.action === "update" ? data.id : null;

  // quizId / assignmentId are unique on Section — guard against double-attaching.
  if (quizId) {
    const owner = await prisma.section.findUnique({ where: { quizId }, select: { id: true } });
    if (owner && owner.id !== currentId) return fail("That quiz is already attached to another section.");
  }
  if (assignmentId) {
    const owner = await prisma.section.findUnique({ where: { assignmentId }, select: { id: true } });
    if (owner && owner.id !== currentId) return fail("That assignment is already attached to another section.");
  }

  const payload = {
    title: data.title,
    order: data.order,
    courseId: data.parentType === "course" ? data.parentId : null,
    batchId: data.parentType === "batch" ? data.parentId : null,
    quizId,
    assignmentId,
  };

  if (data.action === "create") {
    const section = await prisma.section.create({ data: payload });
    return ok({ section });
  }

  const section = await prisma.section.update({ where: { id: data.id }, data: payload });
  return ok({ section });
});
