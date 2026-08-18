import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

const fields = z.object({
  title: z.string().trim().min(2).max(200),
  subtitle: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  code: z.string().trim().max(60).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(0).optional(),
  marks: z.coerce.number().int().min(0),
  passingMarks: z.coerce.number().int().min(0).optional(),
  numberOfQuestions: z.coerce.number().int().min(0).optional(),
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
  const user = await requireRole("ADMIN");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;

  if (data.action === "delete") {
    await prisma.quiz.delete({ where: { id: data.id } });
    return ok({ deleted: true });
  }

  const { action, questionIds, ...rest } = data as typeof data & { id?: string };
  const payload = {
    title: rest.title,
    subtitle: rest.subtitle || null,
    description: rest.description || null,
    code: rest.code || null,
    durationMinutes: rest.durationMinutes ?? null,
    marks: rest.marks,
    passingMarks: rest.passingMarks ?? null,
    numberOfQuestions: rest.numberOfQuestions ?? null,
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
