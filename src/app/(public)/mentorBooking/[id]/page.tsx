import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MentorBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const mentor = await prisma.user.findFirst({
    where: { id, role: "INSTRUCTOR", deletedAt: null },
    include: {
      instructorProfile: {
        include: {
          slots: {
            where: { isBooked: false, date: { gte: new Date() } },
            orderBy: { date: "asc" },
          },
        },
      },
    },
  });

  if (!mentor || !mentor.instructorProfile) notFound();
  const slots = mentor.instructorProfile.slots;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="eyebrow">Book a session</span>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">
        Book time with {mentor.fullName}
      </h1>

      {slots.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No open slots available right now.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {slots.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-foreground">{formatDate(s.date)}</p>
                  <p className="text-sm text-muted-foreground">{s.startTime} – {s.endTime}</p>
                </div>
                <Badge variant="secondary">Open</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">Log in</Link> to book a slot.
      </p>
    </div>
  );
}
