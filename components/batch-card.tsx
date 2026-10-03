import Link from "next/link";
import { BookOpen, CalendarClock, Clock, Users } from "lucide-react";
import type { AvailableBatch } from "@/lib/batches";
import { formatBdt, effectivePrice, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnrollButton } from "@/components/enroll-button";

export function BatchCard({ batch, isAuthed }: { batch: AvailableBatch; isAuthed: boolean }) {
  const full = batch.seats !== null && batch._count.enrollments >= batch.seats;
  return (
    <Card className="flex h-full flex-col overflow-hidden pt-0">
      <Link href={`/courseDetails/${batch.course.id}?batch=${batch.id}`} className="group">
        <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15">
          {batch.course.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={batch.course.thumbnailUrl} alt={batch.course.title} className="h-full w-full object-cover" />
          ) : <BookOpen className="h-10 w-10 text-primary/50" />}
          <Badge className="absolute left-3 top-3">{batch.name || "Course batch"}</Badge>
        </div>
        <div className="px-5 pt-5">
          {batch.course.category && <p className="mb-1 text-xs text-muted-foreground">{batch.course.category.name}</p>}
          <h3 className="font-heading font-semibold group-hover:text-primary">{batch.course.title}</h3>
        </div>
      </Link>
      <CardContent className="flex flex-1 flex-col px-5 pb-5 pt-3">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-start gap-2"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />{batch.startDate ? `Starts ${formatDate(batch.startDate)}` : "Start date to be announced"}</p>
          {batch.endDate && <p className="pl-6">Ends {formatDate(batch.endDate)}</p>}
          {(batch.scheduleDays.length > 0 || batch.scheduleTime) && (
            <p className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0" /><span>{batch.scheduleDays.join(", ")}{batch.scheduleTime && <span className="block">{batch.scheduleTime}</span>}</span></p>
          )}
          {batch.seats !== null && <p className="flex items-center gap-2"><Users className="h-4 w-4" />{Math.max(0, batch.seats - batch._count.enrollments)} seats available</p>}
        </div>
        <div className="mt-auto pt-4">
          <p className="mb-3 font-semibold">{batch.course.isFree ? "Free" : formatBdt(effectivePrice(batch.course))}</p>
          <EnrollButton courseId={batch.course.id} batchId={batch.id} enrolled={batch.enrolled} isAuthed={isAuthed} unavailable={full ? "Batch full" : undefined} />
        </div>
      </CardContent>
    </Card>
  );
}
