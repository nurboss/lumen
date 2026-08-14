import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { LinkStudent } from "@/components/parent/link-student";

export const dynamic = "force-dynamic";

export default async function ParentDashboard() {
  const user = await getSession();

  const links = await prisma.parentStudent.findMany({
    where: { parentId: user!.id },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          enrollments: {
            include: { course: { select: { title: true } } },
          },
          certificates: { select: { id: true } },
          quizResults: { select: { id: true, passed: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <DashboardHeading title="My children" subtitle="Monitor your child's learning progress." />
        <LinkStudent />
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Link a child account using their registered email or phone above.
        </p>
      ) : (
        <div className="space-y-6">
          {links.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-heading text-lg font-bold text-foreground">{l.student.fullName}</h2>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{l.student.certificates.length} certificates</Badge>
                    <Badge variant="secondary">
                      {l.student.quizResults.filter((q) => q.passed).length} quizzes passed
                    </Badge>
                  </div>
                </div>
                {l.student.enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No courses enrolled.</p>
                ) : (
                  <div className="space-y-3">
                    {l.student.enrollments.map((e) => (
                      <div key={e.id}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-foreground">{e.course.title}</span>
                          <span className="text-muted-foreground">{Math.round(e.progressPercent)}%</span>
                        </div>
                        <Progress value={e.progressPercent} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
