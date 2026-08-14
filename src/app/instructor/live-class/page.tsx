import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { HostControls } from "@/components/live/host-controls";

export const dynamic = "force-dynamic";

export default async function InstructorLiveClassPage() {
  const user = await getSession();

  const courses = await prisma.course.findMany({
    where: { authorId: user!.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      sections: {
        orderBy: { order: "asc" },
        select: {
          title: true,
          units: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, classStatus: true, liveSession: { select: { status: true } } },
          },
        },
      },
    },
  });

  const hasUnits = courses.some((c) => c.sections.some((s) => s.units.length > 0));

  return (
    <div>
      <DashboardHeading title="Live class" subtitle="Start a WebRTC live class for any lesson." />
      {!hasUnits ? (
        <p className="text-sm text-muted-foreground">Create a lesson first to host a live class.</p>
      ) : (
        <div className="space-y-6">
          {courses.map((course) => (
            <div key={course.id}>
              <h2 className="mb-3 font-heading text-lg font-bold text-foreground">{course.title}</h2>
              <div className="space-y-3">
                {course.sections.flatMap((s) => s.units).map((unit) => (
                  <Card key={unit.id}>
                    <CardContent className="flex flex-col gap-3 p-5">
                      <p className="font-medium text-foreground">{unit.title}</p>
                      <HostControls
                        unitId={unit.id}
                        hostName={user!.fullName}
                        initialStatus={unit.liveSession?.status ?? unit.classStatus}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
