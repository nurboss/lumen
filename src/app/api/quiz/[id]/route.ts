import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Returns a quiz for taking — WITHOUT correct answers.
export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { question: { select: { id: true, text: true, type: true, options: true, marks: true } } },
      },
    },
  });
  if (!quiz) return fail("Quiz not found.", 404);

  return ok({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      subtitle: quiz.subtitle,
      durationMinutes: quiz.durationMinutes,
      passingMarks: quiz.passingMarks,
      questionsPerPage: quiz.questionsPerPage,
      questions: quiz.questions.map((qq) => ({
        id: qq.question.id,
        text: qq.question.text,
        type: qq.question.type,
        options: qq.question.options, // [{ id, text }] — no correctness leaked
        marks: qq.question.marks,
      })),
    },
  });
});
