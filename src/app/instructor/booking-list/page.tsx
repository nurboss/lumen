import { CalendarClock } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireDashboard } from "@/lib/dashboard";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardHeading, StatCard } from "@/components/dashboard/stat-card";

export const dynamic = "force-dynamic";

export default async function InstructorBookingListPage() {
  const user = await requireDashboard(["INSTRUCTOR"]);
  const bookings = await prisma.booking.findMany({
    where: { slot: { instructor: { userId: user.id } } },
    orderBy: [{ slot: { date: "desc" } }, { createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      createdAt: true,
      student: { select: { fullName: true, email: true } },
      slot: { select: { date: true, startTime: true, endTime: true } },
    },
  });
  const pending = bookings.filter((booking) => booking.status === "PENDING").length;
  const confirmed = bookings.filter((booking) => booking.status === "CONFIRMED").length;

  return (
    <div>
      <DashboardHeading title="Bookings" subtitle="Student sessions booked with you." />
      {bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No students have booked a session with you yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total bookings" value={bookings.length} icon={CalendarClock} />
            <StatCard label="Pending" value={pending} icon={CalendarClock} />
            <StatCard label="Confirmed" value={confirmed} icon={CalendarClock} />
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Session date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Booked on</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <p className="font-medium">{booking.student.fullName}</p>
                      {booking.student.email && <p className="text-xs text-muted-foreground">{booking.student.email}</p>}
                    </TableCell>
                    <TableCell>{formatDate(booking.slot.date)}</TableCell>
                    <TableCell>{booking.slot.startTime}–{booking.slot.endTime}</TableCell>
                    <TableCell>
                      <Badge variant={booking.status === "CANCELLED" ? "destructive" : "secondary"}>
                        {booking.status.charAt(0) + booking.status.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(booking.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
