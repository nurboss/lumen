import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { QuizRunner, type RunnerQuiz } from "@/components/quiz-runner";

export const dynamic = "force-dynamic";

export default async function TakeQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSession();
  if (!user) redirect(`/login?next=/quiz/${id}`);

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { question: { select: { id: true, text: true, type: true, options: true, marks: true } } },
      },
    },
  });
  if (!quiz) notFound();

  const runnerQuiz: RunnerQuiz = {
    id: quiz.id,
    title: quiz.title,
    subtitle: quiz.subtitle,
    durationMinutes: quiz.durationMinutes,
    questions: quiz.questions.map((qq) => ({
      id: qq.question.id,
      text: qq.question.text,
      type: qq.question.type,
      options: (qq.question.options as { id: string; text: string }[] | null) ?? [],
      marks: qq.question.marks,
    })),
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <QuizRunner quiz={runnerQuiz} />
    </div>
  );
}
