import { notFound } from "next/navigation";
import { Lock, PlayCircle, Star, Clock, BarChart3, FileQuestion, ClipboardList } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatBdt, effectivePrice } from "@/lib/format";
import { EnrollButton } from "@/components/enroll-button";
import { getAvailableBatches } from "@/lib/batches";
import { BatchCard } from "@/components/batch-card";

export const revalidate = 60;

export default async function CourseDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ batch?: string }>;
}) {
  const { id } = await params;
  const { batch: selectedBatchId } = await searchParams;

  const course = await prisma.course.findFirst({
    where: { id, deletedAt: null },
    include: {
      category: { select: { name: true } },
      author: { select: { fullName: true, bio: true } },
      sections: {
        orderBy: { order: "asc" },
        include: {
          items: {
            orderBy: { order: "asc" },
            include: {
              unit: true,
              quiz: { select: { id: true, title: true } },
              assignment: { select: { id: true, title: true } },
            },
          },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { enrollments: true, reviews: true } },
    },
  });

  if (!course || course.status !== "PUBLISHED") notFound();

  const user = await getSession();
  const enrolled = user
    ? Boolean(
        await prisma.enrollment.findFirst({
          where: { userId: user.id, courseId: course.id, status: { in: ["ACTIVE", "COMPLETED"] } },
          select: { id: true },
        })
      )
    : false;
  const batches = await getAvailableBatches(user?.id, { courseId: course.id });
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId);

  const price = effectivePrice(course);
  const whatWillLearn = (course.whatWillLearn as string[] | null) ?? [];
  const totalUnits = course.sections.reduce(
    (n, s) => n + s.items.filter((i) => i.kind === "UNIT").length,
    0
  );
  const avgRating =
    course.reviews.length > 0
      ? course.reviews.reduce((s, r) => s + r.rating, 0) / course.reviews.length
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2">
          {course.category && <span className="eyebrow">{course.category.name}</span>}
          <h1 className="mt-2 font-heading text-3xl font-bold text-foreground sm:text-4xl">
            {course.title}
          </h1>
          {course.shortTitle && (
            <p className="mt-3 text-lg text-muted-foreground">{course.shortTitle}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><BarChart3 className="h-4 w-4" /> {course.level}</span>
            <span className="flex items-center gap-1"><PlayCircle className="h-4 w-4" /> {totalUnits} lessons</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {course.type}</span>
            {avgRating && (
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-accent text-accent" /> {avgRating.toFixed(1)} ({course._count.reviews})
              </span>
            )}
          </div>
          {course.author && (
            <p className="mt-4 text-sm text-muted-foreground">Taught by <strong className="text-foreground">{course.author.fullName}</strong></p>
          )}

          {course.description && (
            <div
              className="prose prose-sm mt-8 max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: course.description }}
            />
          )}

          {whatWillLearn.length > 0 && (
            <div className="mt-8">
              <h2 className="font-heading text-xl font-bold">What you&apos;ll learn</h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {whatWillLearn.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {batches.length > 0 && (
            <section id="batches" className="mt-10 scroll-mt-24">
              <h2 className="font-heading text-xl font-bold">Choose your batch</h2>
              <p className="mt-1 text-sm text-muted-foreground">Enroll in the schedule that works for you.</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {batches.map((batch) => <BatchCard key={batch.id} batch={batch} isAuthed={Boolean(user)} />)}
              </div>
            </section>
          )}

          {/* Curriculum */}
          <div className="mt-10">
            <h2 className="font-heading text-xl font-bold">Course content</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {course.sections.length} sections · {totalUnits} lessons
            </p>
            <Accordion className="w-full">
              {course.sections.map((section, si) => {
                const sectionUnlocked = enrolled || (course.firstSectionFree && si === 0);
                return (
                  <AccordionItem key={section.id} value={section.id}>
                    <AccordionTrigger className="text-left font-medium">
                      {section.title}
                      <span className="ml-auto mr-2 text-xs font-normal text-muted-foreground">
                        {section.items.length} items
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-1">
                        {section.items.map((item) => {
                          if (item.kind === "QUIZ" && item.quiz) {
                            return (
                              <li key={item.id} className="flex items-center gap-2 py-1.5 text-sm">
                                <FileQuestion className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-foreground">{item.quiz.title}</span>
                                <Badge variant="outline" className="ml-auto text-[0.65rem]">Quiz</Badge>
                              </li>
                            );
                          }
                          if (item.kind === "ASSIGNMENT" && item.assignment) {
                            return (
                              <li key={item.id} className="flex items-center gap-2 py-1.5 text-sm">
                                <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-foreground">{item.assignment.title}</span>
                                <Badge variant="outline" className="ml-auto text-[0.65rem]">Assignment</Badge>
                              </li>
                            );
                          }
                          if (!item.unit) return null;
                          const unit = item.unit;
                          const unlocked = sectionUnlocked || unit.isFree;
                          return (
                            <li key={item.id} className="flex items-center gap-2 py-1.5 text-sm">
                              {unlocked ? (
                                <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                              ) : (
                                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <span className={unlocked ? "text-foreground" : "text-muted-foreground"}>
                                {unit.title}
                              </span>
                              {unit.isFree && !enrolled && (
                                <Badge variant="secondary" className="ml-auto text-[0.65rem]">Free preview</Badge>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          {/* Reviews */}
          {course.reviews.length > 0 && (
            <div className="mt-10">
              <h2 className="font-heading text-xl font-bold">Student reviews</h2>
              <div className="mt-4 space-y-4">
                {course.reviews.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="p-4">
                      <div className="mb-1 flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < r.rating ? "fill-accent text-accent" : "text-muted"}`}
                          />
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

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20 pt-0 overflow-hidden">
            <div className="flex h-44 items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15">
              {course.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
              ) : (
                <PlayCircle className="h-12 w-12 text-primary/50" />
              )}
            </div>
            <CardContent className="p-6">
              <div className="mb-4 flex items-baseline gap-2">
                {course.isFree ? (
                  <span className="font-heading text-3xl font-bold text-primary">Free</span>
                ) : (
                  <>
                    <span className="font-heading text-3xl font-bold text-foreground">{formatBdt(price)}</span>
                    {course.sellPrice > 0 && course.sellPrice < course.regularPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatBdt(course.regularPrice)}
                      </span>
                    )}
                  </>
                )}
              </div>
              {selectedBatch ? (
                <div>
                  <p className="mb-3 text-sm font-medium">Selected batch: {selectedBatch.name || "Course batch"}</p>
                  <EnrollButton key={selectedBatch.id} courseId={course.id} batchId={selectedBatch.id} enrolled={selectedBatch.enrolled} isAuthed={Boolean(user)} unavailable={selectedBatch.seats !== null && selectedBatch._count.enrollments >= selectedBatch.seats ? "Batch full" : undefined} />
                </div>
              ) : selectedBatchId ? (
                <p role="alert" className="text-sm text-destructive">This batch is no longer available. Choose another batch below.</p>
              ) : course.forceBatchEnrollment && !enrolled ? (
                batches.length > 0 ? <a href="#batches" className="font-medium text-primary hover:underline">Choose a batch to enroll</a> : <p className="text-sm text-muted-foreground">No batches are available for enrollment yet.</p>
              ) : <EnrollButton courseId={course.id} enrolled={enrolled} isAuthed={Boolean(user)} />}
              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                <li>{totalUnits} lessons</li>
                <li>{course._count.enrollments} students enrolled</li>
                {course.completionCertificate && <li>Certificate of completion</li>}
                <li>Full lifetime access</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
