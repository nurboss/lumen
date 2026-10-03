import Link from "next/link";
import { CalendarClock, GraduationCap, Star } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireDashboard } from "@/lib/dashboard";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DashboardHeading } from "@/components/dashboard/stat-card";

export const dynamic = "force-dynamic";

export default async function BookingInstructorPage() {
  const user = await requireDashboard(["STUDENT", "ADMIN"]);
  const availableSlots = { isBooked: false, date: { gte: new Date() } };
  const [mentors, bookings] = await Promise.all([
    prisma.instructorProfile.findMany({
      where: { approved: true, user: { role: "INSTRUCTOR", status: "ACTIVE", deletedAt: null } },
      orderBy: [{ ratingAvg: "desc" }, { ratingCount: "desc" }],
      select: {
        id: true,
        headline: true,
        ratingAvg: true,
        ratingCount: true,
        user: { select: { id: true, fullName: true } },
        slots: {
          where: availableSlots,
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
          take: 3,
          select: { id: true, date: true, startTime: true, endTime: true },
        },
        _count: { select: { slots: { where: availableSlots } } },
      },
    }),
    prisma.booking.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        slot: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
            instructor: { select: { user: { select: { fullName: true } } } },
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <DashboardHeading title="Book a mentor" subtitle="Find an instructor, check available times, and review your bookings." />
        {mentors.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <GraduationCap className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No approved mentors are available right now. Check back later.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {mentors.map((mentor) => (
              <Card key={mentor.id} className="flex h-full flex-col">
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                      {mentor.user.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((name) => name[0]).join("")}
                    </span>
                    <div className="min-w-0">
                      <Link href={`/mentorDetails/${mentor.user.id}`} className="font-heading font-semibold hover:text-primary">{mentor.user.fullName}</Link>
                      {mentor.headline && <p className="mt-1 text-sm text-muted-foreground">{mentor.headline}</p>}
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                        {mentor.ratingCount > 0 ? `${mentor.ratingAvg.toFixed(1)} (${mentor.ratingCount} reviews)` : "No reviews yet"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-medium"><CalendarClock className="h-4 w-4 text-primary" /> Available times</p>
                    {mentor.slots.length > 0 ? (
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {mentor.slots.map((slot) => <li key={slot.id}>{formatDate(slot.date)} · {slot.startTime}–{slot.endTime}</li>)}
                      </ul>
                    ) : <p className="text-sm text-muted-foreground">No open slots right now.</p>}
                    {mentor._count.slots > mentor.slots.length && <p className="mt-2 text-xs text-muted-foreground">{mentor._count.slots - mentor.slots.length} more times available</p>}
                  </div>
                  <div className="mt-auto pt-5">
                    <Link href={mentor.slots.length > 0 ? `/mentorBooking/${mentor.user.id}` : `/mentorDetails/${mentor.user.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>
                      {mentor.slots.length > 0 ? "View availability" : "View mentor profile"}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <section aria-labelledby="my-bookings-heading">
        <h2 id="my-bookings-heading" className="mb-4 font-heading text-xl font-bold">My bookings</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven&apos;t booked any mentor sessions yet.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{booking.slot.instructor.user.fullName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDate(booking.slot.date)} · {booking.slot.startTime}–{booking.slot.endTime}</p>
                  </div>
                  <Badge variant={booking.status === "CANCELLED" ? "destructive" : "secondary"} className="w-fit">
                    {booking.status.charAt(0) + booking.status.slice(1).toLowerCase()}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
