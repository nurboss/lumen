import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Star, Video, Award, Users, ShieldCheck } from "lucide-react";
import prisma from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseCard } from "@/components/course-card";
import { SectionHeader } from "@/components/section-header";
import { Countdown } from "@/components/countdown";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

// This page shares the (public) layout whose navbar reads the session cookie,
// so it must render dynamically per request rather than being statically cached.
export const dynamic = "force-dynamic";

const trustPoints = [
  { icon: Video, title: "Live & recorded", desc: "Learn live over WebRTC or at your own pace." },
  { icon: Award, title: "Verifiable certificates", desc: "Earn certificates you can verify by code." },
  { icon: Users, title: "Expert mentors", desc: "Book one-on-one time with industry experts." },
  { icon: ShieldCheck, title: "Bangla-first", desc: "Content and support in your language." },
];

export default async function HomePage() {
  const [banner, courses, batches, mentors, blogs] = await Promise.all([
    prisma.banner.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" } }),
    prisma.course.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        category: { select: { name: true } },
        author: { select: { fullName: true } },
        _count: { select: { reviews: true } },
      },
    }),
    prisma.batch.findMany({
      where: { deletedAt: null, startDate: { gte: new Date() } },
      orderBy: { startDate: "asc" },
      take: 4,
      include: { course: { select: { title: true, id: true } } },
    }),
    prisma.instructorProfile.findMany({
      where: { approved: true },
      take: 4,
      include: { user: { select: { id: true, fullName: true, avatarUrl: true, bio: true } } },
    }),
    prisma.blog.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { category: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="paper-lines absolute inset-0 opacity-60 pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-2xl reveal">
            <span className="eyebrow">Bangla-first learning platform</span>
            <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {banner?.heroTitle ?? (
                <>
                  Learn with <span className="marker">focus</span>. Grow with Lumen.
                </>
              )}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {banner?.heroSubtitle ??
                "Online & offline courses, live classes, quizzes, and certificates — taught by industry mentors."}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/course" className={cn(buttonVariants({ size: "lg" }))}>
                Browse Courses <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/signUp" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
                Get Started
              </Link>
            </div>

            {banner?.discountTitle && banner.countdownEndsAt && (
              <div className="mt-10 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div>
                  <Badge variant="secondary" className="mb-2">{banner.discountTitle}</Badge>
                  <p className="font-heading text-lg font-semibold">
                    {banner.discountPercent ? `${banner.discountPercent}% off — ends soon` : "Limited offer"}
                  </p>
                </div>
                <Countdown endsAt={banner.countdownEndsAt.toISOString()} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured courses */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Our courses" title="Explore top courses" viewAllHref="/course" />
        {courses.length === 0 ? (
          <EmptyState label="No published courses yet." />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming batches */}
      {batches.length > 0 && (
        <section className="border-y border-border bg-sidebar/40">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <SectionHeader eyebrow="Enroll now" title="Upcoming batches" viewAllHref="/upComingBatch" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {batches.map((b) => (
                <Card key={b.id}>
                  <CardContent className="p-5">
                    <Badge variant="secondary" className="mb-3">{b.name ?? "Batch"}</Badge>
                    <h3 className="mb-2 line-clamp-2 font-heading font-semibold">{b.course.title}</h3>
                    <p className="text-sm text-muted-foreground">Starts {formatDate(b.startDate)}</p>
                    {b.seats && <p className="text-sm text-muted-foreground">{b.seats} seats</p>}
                    <Link
                      href={`/courseDetails/${b.course.id}`}
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-4 w-full")}
                    >
                      View course
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mentors */}
      {mentors.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Meet the mentors" title="Learn from experts" viewAllHref="/mentorsList" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {mentors.map((m) => {
              const initials = m.user.fullName
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("");
              return (
                <Link
                  key={m.id}
                  href={`/mentorDetails/${m.user.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {/* Faint ruled lines — the textbook signature */}
                  <div className="paper-lines pointer-events-none absolute inset-0 opacity-40" />
                  {/* Margin rule that grows on hover, like a highlighted entry */}
                  <span className="absolute left-0 top-6 h-8 w-[3px] rounded-full bg-accent transition-all duration-200 group-hover:top-5 group-hover:h-[calc(100%-2.5rem)]" />

                  <div className="relative flex items-center gap-4">
                    {m.user.avatarUrl ? (
                      <Image
                        src={m.user.avatarUrl}
                        alt={m.user.fullName}
                        width={56}
                        height={56}
                        className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-border"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-heading text-xl font-bold text-primary ring-1 ring-primary/15">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-heading font-semibold text-foreground group-hover:text-primary">
                        {m.user.fullName}
                      </p>
                      {m.headline && (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{m.headline}</p>
                      )}
                    </div>
                  </div>

                  <div className="relative mt-4 flex items-center justify-between border-t border-dashed border-border pt-3">
                    {m.ratingCount > 0 ? (
                      <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                        <span className="font-semibold text-foreground">{m.ratingAvg.toFixed(1)}</span>
                        <span>· {m.ratingCount} {m.ratingCount === 1 ? "review" : "reviews"}</span>
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">New mentor</span>
                    )}
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Why trust us */}
      <section className="border-y border-border bg-sidebar/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Why Lumen" title="Why students trust us" />
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {trustPoints.map((f) => (
              <div key={f.title} className="flex flex-col gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blogs */}
      {blogs.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="From the blog" title="Latest articles" viewAllHref="/blog" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {blogs.map((b) => (
              <Link key={b.id} href={`/blogDetails/${b.slug}`} className="group">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    {b.category && <p className="mb-2 text-xs text-muted-foreground">{b.category.name}</p>}
                    <h3 className="mb-2 line-clamp-2 font-heading font-semibold group-hover:text-primary">{b.title}</h3>
                    {b.subtitle && <p className="line-clamp-2 text-sm text-muted-foreground">{b.subtitle}</p>}
                    <p className="mt-3 text-xs text-muted-foreground">{formatDate(b.createdAt)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-primary px-8 py-12 text-primary-foreground sm:flex-row">
          <div>
            <h2 className="font-heading text-2xl font-bold sm:text-3xl">Ready to start learning?</h2>
            <p className="mt-2 text-primary-foreground/80">Join Lumen and grow your skills today.</p>
          </div>
          <Link href="/signUp" className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}>
            Create free account <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
