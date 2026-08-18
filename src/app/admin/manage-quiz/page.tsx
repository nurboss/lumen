import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { QuizManager } from "@/components/admin/quiz-manager";

export const dynamic = "force-dynamic";

export default async function ManageQuizPage() {
  const [quizzes, questions] = await Promise.all([
    prisma.quiz.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { questions: true, results: true } },
        questions: { select: { questionId: true }, orderBy: { order: "asc" } },
      },
    }),
    prisma.question.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, text: true, type: true, marks: true },
    }),
  ]);

  return (
    <div>
      <DashboardHeading title="Quizzes" subtitle="Build quizzes from your question bank." />
      <QuizManager quizzes={JSON.parse(JSON.stringify(quizzes))} questions={questions} />
    </div>
  );
}
