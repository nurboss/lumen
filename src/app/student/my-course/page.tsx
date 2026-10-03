import Link from "next/link";
import { BookOpen, Award } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DashboardHeading } from "@/components/dashboard/stat-card";

export default async function MyCoursesPage() {
  const user = await getSession();
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user!.id },
    orderBy: { enrolledAt: "desc" },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          shortTitle: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div>
      <DashboardHeading title="My courses" subtitle="Continue where you left off." />

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">You haven&apos;t enrolled in any courses yet.</p>
            <Link href="/course" className="text-sm font-medium text-primary hover:underline">
              Browse courses
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((e) => {
            const complete = e.progressPercent >= 100;
            return (
              <Card key={e.id} className="group flex h-full flex-col transition-shadow hover:shadow-md">
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex items-center justify-between">
                    {e.course.category && (
                      <span className="text-xs text-muted-foreground">{e.course.category.name}</span>
                    )}
                    {(e.status === "COMPLETED" || complete) && <Badge variant="secondary">Completed</Badge>}
                  </div>
                  <Link href={`/student/my-course/${e.course.id}`}>
                    <h3 className="mb-3 line-clamp-2 font-heading font-semibold group-hover:text-primary">
                      {e.course.title}
                    </h3>
                  </Link>
                  <Progress value={e.progressPercent} className="h-2" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {Math.round(e.progressPercent)}% complete
                  </p>

                  <div className="mt-4 flex flex-1 items-end">
                    {complete ? (
                      <Link
                        href={`/student/my-course/${e.course.id}/certificate`}
                        className={`${buttonVariants({ size: "sm" })} w-full`}
                      >
                        <Award className="mr-1.5 h-4 w-4" /> Get certificate
                      </Link>
                    ) : (
                      <Link
                        href={`/student/my-course/${e.course.id}`}
                        className={`${buttonVariants({ variant: "outline", size: "sm" })} w-full`}
                      >
                        Continue learning
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
