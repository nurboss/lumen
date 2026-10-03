import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { assertContentManageable } from "@/lib/content-access";

const fields = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(0).optional(),
  marks: z.coerce.number().int().min(0),
  passingMarks: z.coerce.number().int().min(0).optional(),
  negativeMarkPerQuiz: z.coerce.number().min(0).optional(),
  questionsPerPage: z.coerce.number().int().min(0).optional(),
  extraRetakes: z.coerce.number().int().min(0),
  randomize: z.boolean(),
  showResultAfterSubmit: z.boolean(),
  autoEvaluate: z.boolean(),
  questionIds: z.array(z.string()).optional(),
});

const schema = z.discriminatedUnion("action", [
  fields.extend({ action: z.literal("create") }),
  fields.extend({ action: z.literal("update"), id: z.string().min(1) }),
  z.object({ action: z.literal("delete"), id: z.string().min(1) }),
]);

export const POST = handler(async (req: Request) => {
  const user = await requireRole("ADMIN", "INSTRUCTOR");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;
  if (data.action !== "create") await assertContentManageable("quiz", data.id, user);

  if (data.action === "delete") {
    await prisma.quiz.delete({ where: { id: data.id } });
    return ok({ deleted: true });
  }

  const { action, questionIds, ...rest } = data as typeof data & { id?: string };
  if (questionIds && user.role !== "ADMIN") {
    const ids = [...new Set(questionIds)];
    const count = await prisma.question.count({ where: { id: { in: ids }, authorId: user.id } });
    if (count !== ids.length) return fail("You can only use questions from your own question bank.", 403);
  }
  const payload = {
    title: rest.title,
    description: rest.description || null,
    durationMinutes: rest.durationMinutes ?? null,
    marks: rest.marks,
    passingMarks: rest.passingMarks ?? null,
    negativeMarkPerQuiz: rest.negativeMarkPerQuiz ?? null,
    questionsPerPage: rest.questionsPerPage ?? null,
    extraRetakes: rest.extraRetakes,
    randomize: rest.randomize,
    showResultAfterSubmit: rest.showResultAfterSubmit,
    autoEvaluate: rest.autoEvaluate,
  };

  const quizId =
    action === "create"
      ? (await prisma.quiz.create({ data: { ...payload, authorId: user.id } })).id
      : (rest as { id: string }).id;

  if (action === "update") {
    await prisma.quiz.update({ where: { id: quizId }, data: payload });
  }

  if (questionIds) {
    await prisma.quizQuestion.deleteMany({ where: { quizId } });
    if (questionIds.length) {
      await prisma.quizQuestion.createMany({
        data: questionIds.map((questionId, order) => ({ quizId, questionId, order })),
      });
    }
  }

  return ok({ id: quizId });
});
