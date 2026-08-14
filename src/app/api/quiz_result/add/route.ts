import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { scoreQuiz, type ScorableQuestion } from "@/lib/quiz";

const schema = z.object({
  quizId: z.string().min(1),
  answers: z.record(z.string(), z.unknown()),
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { quizId, answers } = parsed.data;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { include: { question: { select: { id: true, type: true, correctAnswer: true, marks: true } } } },
    },
  });
  if (!quiz) return fail("Quiz not found.", 404);

  // Enforce retake limit (initial attempt + extraRetakes).
  const priorAttempts = await prisma.quizResult.count({ where: { quizId, userId: user.id } });
  if (priorAttempts >= 1 + quiz.extraRetakes) {
    return fail("You have used all your attempts for this quiz.", 403);
  }

  const questions: ScorableQuestion[] = quiz.questions.map((qq) => ({
    id: qq.question.id,
    type: qq.question.type,
    correctAnswer: qq.question.correctAnswer,
    marks: qq.question.marks,
  }));

  const { score, maxScore } = scoreQuiz(questions, answers, {
    negativeMarkPerQuiz: quiz.negativeMarkPerQuiz ?? undefined,
  });

  const passingMarks = quiz.passingMarks ?? Math.ceil(maxScore * 0.5);
  const passed = score >= passingMarks;

  const result = await prisma.quizResult.create({
    data: {
      quizId,
      userId: user.id,
      answers: answers as object,
      score,
      passed,
      attempt: priorAttempts + 1,
    },
  });

  return ok({
    resultId: result.id,
    score,
    maxScore,
    passed,
    showResult: quiz.showResultAfterSubmit,
  });
});
