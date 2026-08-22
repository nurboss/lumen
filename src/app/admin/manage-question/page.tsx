import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { QuestionManager } from "@/components/admin/question-manager";

export const dynamic = "force-dynamic";

export default async function ManageQuestionPage() {
  const questions = await prisma.question.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <DashboardHeading title="Question bank" subtitle="Author reusable questions for quizzes." />
      <QuestionManager questions={JSON.parse(JSON.stringify(questions))} />
    </div>
  );
}
