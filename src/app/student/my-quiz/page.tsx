import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MyQuizPage() {
  const user = await getSession();
  const results = await prisma.quizResult.findMany({
    where: { userId: user!.id },
    orderBy: { submittedAt: "desc" },
    include: { quiz: { select: { title: true, marks: true } } },
  });

  return (
    <div>
      <DashboardHeading title="My quizzes" subtitle="Your quiz attempts and scores." />
      {results.length === 0 ? (
        <p className="text-sm text-muted-foreground">You haven&apos;t taken any quizzes yet.</p>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="font-heading font-semibold text-foreground">{r.quiz.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Attempt {r.attempt} · {formatDate(r.submittedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {r.score}/{r.quiz.marks}
                  </span>
                  <Badge variant={r.passed ? "default" : "destructive"}>
                    {r.passed ? "Passed" : "Failed"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
