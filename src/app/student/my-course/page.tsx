import Link from "next/link";
import { BookOpen } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
          {enrollments.map((e) => (
            <Link key={e.id} href={`/student/my-course/${e.course.id}`} className="group">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="mb-2 flex items-center justify-between">
                    {e.course.category && (
                      <span className="text-xs text-muted-foreground">{e.course.category.name}</span>
                    )}
                    {e.status === "COMPLETED" && <Badge variant="secondary">Completed</Badge>}
                  </div>
                  <h3 className="mb-3 line-clamp-2 font-heading font-semibold group-hover:text-primary">
                    {e.course.title}
                  </h3>
                  <Progress value={e.progressPercent} className="h-2" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {Math.round(e.progressPercent)}% complete
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
