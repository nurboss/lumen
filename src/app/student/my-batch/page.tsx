import Link from "next/link";
import { BookOpen, CalendarClock, Clock, Video } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireDashboard } from "@/lib/dashboard";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { getAvailableBatches } from "@/lib/batches";
import { BatchCard } from "@/components/batch-card";

export const dynamic = "force-dynamic";

const DAY_LABELS: Record<string, string> = {
  SAT: "Saturday",
  SUN: "Sunday",
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
};

export default async function MyBatchPage() {
  const user = await requireDashboard(["STUDENT", "ADMIN"]);
  const batches = await prisma.batch.findMany({
    where: {
      deletedAt: null,
      course: { deletedAt: null },
      enrollments: {
        some: { userId: user.id, status: { in: ["ACTIVE", "COMPLETED"] } },
      },
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      scheduleDays: true,
      scheduleTime: true,
      course: { select: { id: true, title: true } },
    },
  });
  const availableBatches = (await getAvailableBatches(user.id)).filter((batch) => !batch.enrolled);
  const now = new Date();

  return (
    <div>
      <DashboardHeading title="My batches" subtitle="Your enrolled batches and class schedules." />
      <h2 className="mb-4 font-heading text-lg font-semibold">Enrolled batches</h2>

      {batches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">You haven&apos;t enrolled in any batches yet.</p>
            <Link href="/upComingBatch" className="text-sm font-medium text-primary hover:underline">
              Browse upcoming batches
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => {
            const upcoming = Boolean(batch.startDate && batch.startDate > now);
            const ended = Boolean(batch.endDate && batch.endDate < now);
            const status = ended ? "Ended" : upcoming ? "Upcoming" : batch.startDate ? "In progress" : "Schedule pending";

            return (
              <Card key={batch.id} className="flex h-full flex-col">
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-primary">{batch.name || "Course batch"}</span>
                    <Badge variant={ended ? "secondary" : "outline"}>{status}</Badge>
                  </div>
                  <h2 className="font-heading font-semibold text-foreground">{batch.course.title}</h2>

                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarClock className="h-4 w-4" /> Dates
                      </dt>
                      <dd className="mt-1 text-foreground">
                        {batch.startDate ? `Starts ${formatDate(batch.startDate)}` : "Start date to be announced"}
                        {batch.endDate && <span className="block">Ends {formatDate(batch.endDate)}</span>}
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-4 w-4" /> Class schedule
                      </dt>
                      <dd className="mt-1 text-foreground">
                        {batch.scheduleDays.length > 0
                          ? batch.scheduleDays.map((day) => DAY_LABELS[day] ?? day).join(", ")
                          : "Class days to be announced"}
                        {batch.scheduleTime && <span className="block">{batch.scheduleTime}</span>}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <Link href={`/student/my-course/${batch.course.id}`} className={cn(buttonVariants({ size: "sm" }), "flex-1")}>
                      <BookOpen className="h-4 w-4" /> Open course
                    </Link>
                    {!ended && (
                      <Link href="/student/live-class" className={buttonVariants({ variant: "outline", size: "sm" })}>
                        <Video className="h-4 w-4" /> Live classes
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <section className="mt-10" aria-labelledby="available-batches-heading">
        <h2 id="available-batches-heading" className="font-heading text-xl font-bold">Available batch courses</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose a batch to join your next class.</p>
        {availableBatches.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableBatches.map((batch) => <BatchCard key={batch.id} batch={batch} isAuthed />)}
          </div>
        ) : <p className="mt-4 text-sm text-muted-foreground">No other batches are available for enrollment right now.</p>}
      </section>
    </div>
  );
}
