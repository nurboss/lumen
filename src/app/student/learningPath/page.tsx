import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Layers, Lock } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireDashboard } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardHeading, StatCard } from "@/components/dashboard/stat-card";

export const dynamic = "force-dynamic";

export default async function LearningPathPage() {
  const user = await requireDashboard(["STUDENT", "ADMIN"]);
  const [enrollments, completedEnrollments] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        userId: user.id,
        status: { in: ["ACTIVE", "COMPLETED"] },
        course: { deletedAt: null, status: "PUBLISHED" },
      },
      orderBy: { enrolledAt: "asc" },
      select: {
        progressPercent: true,
        course: {
          select: {
            id: true,
            title: true,
            level: true,
            prerequisiteCourseId: true,
            prerequisiteCourse: { select: { id: true, title: true, status: true, deletedAt: true } },
          },
        },
      },
    }),
    prisma.enrollment.findMany({
      where: { userId: user.id, status: "COMPLETED" },
      select: { courseId: true },
    }),
  ]);
  const completedIds = new Set(completedEnrollments.map((enrollment) => enrollment.courseId));

  // Multiple batch enrollments share a course; show that course once with its
  // highest progress, and place enrolled prerequisites before their dependents.
  const byCourse = new Map<string, (typeof enrollments)[number]>();
  for (const enrollment of enrollments) {
    const previous = byCourse.get(enrollment.course.id);
    if (!previous || enrollment.progressPercent > previous.progressPercent) {
      byCourse.set(enrollment.course.id, enrollment);
    }
  }
  const path: (typeof enrollments)[number][] = [];
  const visited = new Set<string>();
  function addCourse(courseId: string) {
    if (visited.has(courseId)) return;
    visited.add(courseId); // Also stops malformed prerequisite cycles.
    const enrollment = byCourse.get(courseId);
    if (!enrollment) return;
    if (enrollment.course.prerequisiteCourseId) addCourse(enrollment.course.prerequisiteCourseId);
    path.push(enrollment);
  }
  for (const courseId of byCourse.keys()) addCourse(courseId);

  const isLocked = (course: (typeof enrollments)[number]["course"]) =>
    !completedIds.has(course.id) && Boolean(course.prerequisiteCourseId && !completedIds.has(course.prerequisiteCourseId));
  const nextCourse = path.find(({ course }) => !completedIds.has(course.id) && !isLocked(course));
  const completedCount = path.filter(({ course }) => completedIds.has(course.id)).length;

  return (
    <div>
      <DashboardHeading title="Learning path" subtitle="Follow your course progress and see what to complete next." />

      {path.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Layers className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Enroll in a course to start your learning path.</p>
            <Link href="/course" className={buttonVariants({ size: "sm" })}>Browse courses</Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Courses in your path" value={path.length} icon={Layers} />
            <StatCard label="Completed courses" value={completedCount} icon={CheckCircle2} />
            <StatCard label="Courses remaining" value={path.length - completedCount} icon={BookOpen} />
          </div>

          <ol className="space-y-4">
            {path.map(({ course, progressPercent }, index) => {
              const complete = completedIds.has(course.id);
              const locked = isLocked(course);
              const next = nextCourse?.course.id === course.id;
              const progress = complete ? 100 : Math.max(0, Math.min(100, progressPercent));
              const prerequisite = course.prerequisiteCourse;
              const prerequisiteAvailable = prerequisite?.status === "PUBLISHED" && !prerequisite.deletedAt;

              return (
                <li key={course.id}>
                  <Card className={cn(next && "border-primary/50")}>
                    <CardContent className="flex items-start gap-3 p-5 sm:gap-4">
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold", complete && "bg-primary/10 text-primary")}>
                        {complete ? <CheckCircle2 className="h-5 w-5" /> : locked ? <Lock className="h-4 w-4" /> : index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-heading font-semibold">{course.title}</h2>
                          <Badge variant={next ? "default" : "secondary"}>
                            {complete ? "Completed" : locked ? "Prerequisite required" : next ? "Up next" : progress > 0 ? "In progress" : "Ready to start"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{course.level.toLowerCase()}</p>
                        <Progress value={progress} aria-label={`${course.title} progress`} className="mt-4" />
                        <p className="mt-2 text-xs text-muted-foreground">{Math.round(progress)}% complete</p>

                        {locked ? (
                          <div className="mt-4 text-sm text-muted-foreground">
                            <p>Complete {prerequisite?.title || "the prerequisite course"} first.</p>
                            {prerequisiteAvailable && (
                              <Link href={byCourse.has(prerequisite.id) ? `/student/my-course/${prerequisite.id}` : `/courseDetails/${prerequisite.id}`} className="mt-2 inline-flex items-center gap-1 text-primary hover:underline">
                                Open prerequisite <ArrowRight className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        ) : (
                          <Link href={`/student/my-course/${course.id}`} className={cn(buttonVariants({ variant: next ? "default" : "outline", size: "sm" }), "mt-4")}>
                            {complete ? "Review course" : progress > 0 ? "Continue learning" : "Start learning"}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>

          <Link href="/course" className="mt-6 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Explore more courses <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      )}
    </div>
  );
}
