import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { CalendarClock, MapPin } from "lucide-react";

export const revalidate = 60;

export default async function SeminarPage() {
  const seminars = await prisma.seminar.findMany({
    orderBy: { date: "asc" },
    include: { _count: { select: { participants: true } } },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="eyebrow">Events</span>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">Seminars &amp; workshops</h1>

      {seminars.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No seminars scheduled yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {seminars.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-5">
                <h2 className="mb-2 font-heading font-semibold text-foreground">{s.title}</h2>
                {s.description && <p className="line-clamp-3 text-sm text-muted-foreground">{s.description}</p>}
                <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> {formatDate(s.date)} {s.time && `· ${s.time}`}</p>
                  {s.location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {s.location}</p>}
                </div>
                {s.seats && (
                  <Badge variant="secondary" className="mt-4">
                    {s._count.participants}/{s.seats} registered
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
