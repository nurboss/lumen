import Link from "next/link";
import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

export const revalidate = 60;

export default async function UpcomingBatchPage() {
  const batches = await prisma.batch.findMany({
    where: { deletedAt: null, startDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    include: { course: { select: { id: true, title: true } }, _count: { select: { enrollments: true } } },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="eyebrow">Enroll now</span>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">Upcoming batches</h1>

      {batches.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No upcoming batches scheduled.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-5">
                <Badge variant="secondary" className="mb-3">{b.name ?? "Batch"}</Badge>
                <h2 className="mb-2 font-heading font-semibold text-foreground">{b.course.title}</h2>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Starts {formatDate(b.startDate)}</p>
                  {b.endDate && <p>Ends {formatDate(b.endDate)}</p>}
                  {b.scheduleDays.length > 0 && <p>{b.scheduleDays.join(", ")} {b.scheduleTime && `· ${b.scheduleTime}`}</p>}
                  {b.seats && <p>{b._count.enrollments}/{b.seats} enrolled</p>}
                </div>
                <Link
                  href={`/courseDetails/${b.course.id}`}
                  className={cn(buttonVariants({ size: "sm" }), "mt-4 w-full")}
                >
                  View course
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
