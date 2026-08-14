import Link from "next/link";
import { Star } from "lucide-react";
import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";

export const revalidate = 60;

export default async function MentorsListPage() {
  const mentors = await prisma.instructorProfile.findMany({
    where: { approved: true },
    orderBy: { ratingAvg: "desc" },
    include: { user: { select: { id: true, fullName: true, bio: true } } },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="eyebrow">Meet the mentors</span>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">Our mentors</h1>

      {mentors.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No mentors available yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mentors.map((m) => (
            <Link key={m.id} href={`/mentorDetails/${m.user.id}`} className="group">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex gap-4 p-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-bold text-primary">
                    {m.user.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading font-semibold text-foreground group-hover:text-primary">{m.user.fullName}</p>
                    {m.headline && <p className="text-sm text-muted-foreground line-clamp-1">{m.headline}</p>}
                    <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                      {m.ratingAvg.toFixed(1)} ({m.ratingCount})
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
