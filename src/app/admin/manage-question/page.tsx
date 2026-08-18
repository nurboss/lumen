import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { QuestionManager } from "@/components/admin/question-manager";

export const dynamic = "force-dynamic";

export default async function ManageQuestionPage() {
  const [questions, tags] = await Promise.all([
    prisma.question.findMany({
      orderBy: { createdAt: "desc" },
      include: { tags: { select: { id: true, name: true } } },
    }),
    prisma.questionTag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <DashboardHeading title="Question bank" subtitle="Author reusable questions for quizzes." />
      <QuestionManager questions={JSON.parse(JSON.stringify(questions))} tags={tags} />
    </div>
  );
}
