import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

const questionType = z.enum(["MCQ_SINGLE", "MCQ_MULTI", "TRUE_FALSE", "SHORT_ANSWER", "DESCRIPTIVE"]);
const option = z.object({ id: z.string(), text: z.string() });

const fields = z.object({
  text: z.string().trim().min(1, "Question text is required.").max(5000),
  type: questionType,
  marks: z.coerce.number().int().min(1).max(1000),
  options: z.array(option).optional(),
  correctAnswer: z.union([z.array(z.string()), z.string()]).optional(),
  tagIds: z.array(z.string()).optional(),
});

const schema = z.discriminatedUnion("action", [
  fields.extend({ action: z.literal("create") }),
  fields.extend({ action: z.literal("update"), id: z.string().min(1) }),
  z.object({ action: z.literal("delete"), id: z.string().min(1) }),
]);

export const POST = handler(async (req: Request) => {
  const user = await requireRole("ADMIN");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;

  if (data.action === "delete") {
    await prisma.question.delete({ where: { id: data.id } });
    return ok({ deleted: true });
  }

  const needsOptions = data.type === "MCQ_SINGLE" || data.type === "MCQ_MULTI" || data.type === "TRUE_FALSE";
  if (needsOptions && (!data.options || data.options.length < 2)) {
    return fail("Provide at least two options.");
  }

  const payload = {
    text: data.text,
    type: data.type,
    marks: data.marks,
    options: needsOptions ? data.options : undefined,
    correctAnswer: data.type === "DESCRIPTIVE" ? undefined : (data.correctAnswer ?? undefined),
  };

  if (data.action === "create") {
    const question = await prisma.question.create({
      data: {
        ...payload,
        authorId: user.id,
        tags: data.tagIds?.length ? { connect: data.tagIds.map((id) => ({ id })) } : undefined,
      },
    });
    return ok({ question });
  }

  const question = await prisma.question.update({
    where: { id: data.id },
    data: {
      ...payload,
      tags: { set: data.tagIds?.map((id) => ({ id })) ?? [] },
    },
  });
  return ok({ question });
});
