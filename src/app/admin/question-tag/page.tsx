import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { QuestionTagManager } from "@/components/admin/question-tag-manager";

export const dynamic = "force-dynamic";

export default async function QuestionTagPage() {
  const tags = await prisma.questionTag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div>
      <DashboardHeading title="Question tags" subtitle="Label your question bank for random quizzes." />
      <QuestionTagManager tags={tags} />
    </div>
  );
}
