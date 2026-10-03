import prisma from "@/lib/prisma";
import { requireDashboard } from "@/lib/dashboard";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { QuizManager } from "@/components/admin/quiz-manager";
import { QuestionManager } from "@/components/admin/question-manager";

export const dynamic = "force-dynamic";

export default async function ManageQuizPage() {
  const user = await requireDashboard(["INSTRUCTOR"]);
  const [quizzes, questions] = await Promise.all([
    prisma.quiz.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { questions: true, results: true } },
        questions: { select: { questionId: true }, orderBy: { order: "asc" } },
      },
    }),
    prisma.question.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <DashboardHeading title="Quizzes" subtitle="Build quizzes from your question bank." />
      <QuizManager quizzes={JSON.parse(JSON.stringify(quizzes))} questions={questions} />
      <section className="mt-10" aria-labelledby="question-bank-heading">
        <h2 id="question-bank-heading" className="mb-2 font-heading text-xl font-bold">Your question bank</h2>
        <p className="mb-4 text-sm text-muted-foreground">Create questions here, then add them to your quizzes.</p>
        <QuestionManager questions={JSON.parse(JSON.stringify(questions))} />
      </section>
    </div>
  );
}

