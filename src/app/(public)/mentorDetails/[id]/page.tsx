import { notFound } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CourseCard } from "@/components/course-card";
import { cn } from "@/lib/utils";

export const revalidate = 60;

export default async function MentorDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const mentor = await prisma.user.findFirst({
    where: { id, role: "INSTRUCTOR", deletedAt: null },
    include: {
      instructorProfile: { include: { reviews: { orderBy: { createdAt: "desc" }, take: 10 } } },
      authoredCourses: {
        where: { status: "PUBLISHED", deletedAt: null },
        include: {
          category: { select: { name: true } },
          author: { select: { fullName: true } },
          _count: { select: { reviews: true } },
        },
      },
    },
  });

  if (!mentor || !mentor.instructorProfile) notFound();
  const profile = mentor.instructorProfile;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start gap-6 sm:flex-row">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-2xl font-bold text-primary">
          {mentor.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </div>
        <div className="flex-1">
          <h1 className="font-heading text-3xl font-bold text-foreground">{mentor.fullName}</h1>
          {profile.headline && <p className="mt-1 text-lg text-muted-foreground">{profile.headline}</p>}
          <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-accent text-accent" />
            {profile.ratingAvg.toFixed(1)} ({profile.ratingCount} reviews)
          </p>
          {mentor.bio && <p className="mt-4 max-w-2xl text-muted-foreground">{mentor.bio}</p>}
          <Link href={`/mentorBooking/${mentor.id}`} className={cn(buttonVariants(), "mt-4")}>
            Book a session
          </Link>
        </div>
      </div>

      {mentor.authoredCourses.length > 0 && (
        <div className="mt-12">
          <h2 className="font-heading text-xl font-bold">Courses by {mentor.fullName}</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {mentor.authoredCourses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </div>
      )}

      {profile.reviews.length > 0 && (
        <div className="mt-12">
          <h2 className="font-heading text-xl font-bold">Reviews</h2>
          <div className="mt-4 space-y-4">
            {profile.reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="mb-1 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-accent text-accent" : "text-muted"}`} />
                    ))}
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
