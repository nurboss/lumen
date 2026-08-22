import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { JoinLive } from "@/components/live/join-live";

export const dynamic = "force-dynamic";

export default async function StudentLiveClassPage() {
  const user = await getSession();

  // Courses the student is enrolled in.
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user!.id },
    select: { courseId: true },
  });
  const courseIds = enrollments.map((e) => e.courseId);

  // Live sessions currently STARTED in those courses.
  const liveUnits = await prisma.unit.findMany({
    where: {
      section: { courseId: { in: courseIds } },
      liveSession: { status: "STARTED" },
    },
    select: {
      id: true,
      title: true,
      section: { select: { course: { select: { title: true } } } },
    },
  });

  return (
    <div>
      <DashboardHeading title="Live classes" subtitle="Join your instructor's live sessions." />
      {liveUnits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No live classes right now. Check back later.</p>
      ) : (
        <div className="space-y-3">
          {liveUnits.map((unit) => (
            <Card key={unit.id}>
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{unit.title}</p>
                    <p className="text-sm text-muted-foreground">{unit.section?.course?.title}</p>
                  </div>
                  <Badge>Live now</Badge>
                </div>
                <JoinLive unitId={unit.id} displayName={user!.fullName} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
