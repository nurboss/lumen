import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Star,
  Video,
  Award,
  Users,
  BookOpen,
  Check,
  CalendarDays,
  Compass,
  Sparkles,
  Play,
  Search,
  Globe,
  Plus,
  Sprout,
  Laptop,
  Palette,
  BriefcaseBusiness,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { CourseCard } from "@/components/course-card";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const benefits = [
  {
    icon: Video,
    title: "Your pace. Your place.",
    desc: "Join a live class or revisit a recorded lesson. Make learning fit your everyday life.",
  },
  {
    icon: Users,
    title: "A mentor in your corner",
    desc: "Get guidance from industry experts and book one-on-one time when you need it.",
  },
  {
    icon: Award,
    title: "Skills you can show",
    desc: "Put what you learn into practice and earn a certificate others can verify.",
  },
];
const faqs = [
  {
    question: "How do I get started?",
    answer:
      "Create a free Lumen account, browse the course catalog, and choose a course or an upcoming batch. Each course page includes the details you need before enrolling.",
  },
  {
    question: "Can I learn at my own pace?",
    answer:
      "Yes. Recorded lessons let you work through a course on your schedule. If you prefer a structured experience, choose a scheduled batch and learn with your class.",
  },
  {
    question: "Are the courses taught in Bangla?",
    answer:
      "Lumen is a Bangla-first learning platform. Check the details of your chosen course for its language, curriculum, and instructor information.",
  },
  {
    question: "Can I get help from a mentor?",
    answer:
      "Browse our approved mentors to explore their expertise and available booking options. You can also join the community forum to ask questions and connect with other learners.",
  },
  {
    question: "How can I verify a certificate?",
    answer:
      "Use the Verify Certificate page and enter the code on your certificate to check its details.",
  },
];
const categoryIcons = [
  Laptop,
  Palette,
  BriefcaseBusiness,
  Globe,
  BookOpen,
  Compass,
];

export default async function HomePage() {
  const [courses, batches, mentors, categories] = await Promise.all([
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
      where: {
        deletedAt: null,
        startDate: { gte: new Date() },
        course: { status: "PUBLISHED", deletedAt: null },
      },
      orderBy: { startDate: "asc" },
      take: 3,
      include: { course: { select: { title: true, id: true } } },
    }),
    prisma.instructorProfile.findMany({
      where: { approved: true },
      take: 4,
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    }),
    prisma.courseCategory.findMany({
      where: { courses: { some: { status: "PUBLISHED", deletedAt: null } } },
      orderBy: { name: "asc" },
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            courses: { where: { status: "PUBLISHED", deletedAt: null } },
          },
        },
      },
    }),
  ]);

  return (
    <div className="lumen-home">
      <section className="home-hero">
        <div className="home-container grid items-center gap-14 py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-20">
          <div className="reveal">
            <div className="home-kicker">
              <span className="h-2 w-2 rounded-full bg-primary" /> A little
              curiosity. A world of possibility.
            </div>
            <h1 className="mt-6 max-w-xl font-heading text-[clamp(2.7rem,4.8vw,4.25rem)] font-bold leading-[1.08] tracking-[-0.055em]">
              Your next chapter
              <br />
              starts with <span className="home-highlight">learning.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-muted-foreground sm:text-lg">
              Big ambitions start with small steps. Build real skills with
              Bangla-first courses, inspiring mentors, and a community that
              grows with you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/course" className="home-button">
                Find your course <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href="/upComingBatch"
                className="home-button home-button-outline"
              >
                <Video className="size-4" /> Explore live classes
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground sm:text-sm">
              <span className="flex items-center gap-2">
                <Check className="size-4 text-primary" /> Learn in Bangla
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4 text-primary" /> Expert-led courses
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4 text-primary" /> At your own pace
              </span>
            </div>
          </div>
          <LearningIllustration />
        </div>
        <div className="border-t border-border/70">
          <div className="home-container grid grid-cols-2 gap-5 py-6 text-sm sm:grid-cols-4">
            {[
              { icon: BookOpen, label: "Practical, focused courses" },
              { icon: Video, label: "Live & recorded learning" },
              { icon: Users, label: "Guidance from real experts" },
              { icon: Award, label: "Verifiable certificates" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 font-medium">
                <Icon className="size-5 shrink-0 text-primary" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="home-container home-section"
        aria-labelledby="courses-heading"
      >
        <SectionIntro
          id="courses-heading"
          label="FIND YOUR NEXT STEP"
          title="A new skill. A new possibility."
          description="Explore something new or go deeper into what you love."
          href="/course"
          linkLabel="Explore all courses"
        />
        <form action="/course" method="get" className="home-search">
          <Search
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="home-course-search" className="sr-only">
            Search courses
          </label>
          <input
            id="home-course-search"
            name="q"
            type="search"
            placeholder="What would you like to learn?"
            className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none sm:text-base"
          />
          <button type="submit" className="home-button px-4 sm:px-6">
            Search <ArrowRight className="hidden size-4 sm:block" />
          </button>
        </form>
        {categories.length > 0 && (
          <div className="mb-8 mt-5 flex flex-wrap gap-2">
            <Link
              href="/course"
              className="home-chip bg-primary text-primary-foreground"
            >
              All courses <ArrowUpRight className="size-3.5" />
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/course?category=${encodeURIComponent(category.slug)}`}
                className="home-chip"
              >
                {category.name}
                <span className="text-muted-foreground">
                  {category._count.courses}
                </span>
              </Link>
            ))}
          </div>
        )}
        {courses.length > 0 ? (
          <div
            className={`home-course-grid mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 ${courses.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
          >
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} appearance="home" />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <BookOpen className="mx-auto mb-4 size-8 text-primary" />
            <h3 className="font-heading text-xl font-semibold">
              Good things are on the way.
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              New courses will appear here as they are published. Meet our
              mentors while you wait.
            </p>
            <Link
              href="/mentorsList"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              Explore mentors <ArrowRight className="size-4" />
            </Link>
          </div>
        )}
        {categories.length > 0 && (
          <div className="mt-12">
            <div className="mb-5 flex items-center gap-3">
              <Compass className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Follow your curiosity</h3>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
              {categories.map((category, index) => {
                const Icon = categoryIcons[index % categoryIcons.length];
                return (
                  <Link
                    key={category.id}
                    href={`/course?category=${encodeURIComponent(category.slug)}`}
                    className="home-category group"
                  >
                    <Icon className="size-6 text-primary" />
                    <span className="mt-4 font-semibold leading-snug">
                      {category.name}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {category._count.courses}{" "}
                      {category._count.courses === 1 ? "course" : "courses"}
                      <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="home-benefits" aria-labelledby="why-heading">
        <div className="home-container home-section">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <span className="home-kicker text-primary">BUILT AROUND YOU</span>
              <h2 id="why-heading" className="home-title mt-4">
                Learning feels better
                <br />
                when you belong.
              </h2>
              <p className="mt-5 max-w-md leading-7 text-muted-foreground">
                You bring the curiosity. We bring the support, structure, and
                people to help you keep moving forward.
              </p>
              <Link
                href="/aboutUs"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                Get to know Lumen <ArrowRight className="size-4" />
              </Link>
              <div className="mt-9 inline-flex items-center gap-3 rounded-xl border border-primary/15 bg-background px-5 py-4">
                <Globe className="size-6 text-primary" />
                <div>
                  <p className="text-sm font-semibold">
                    Global skills. Your language.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bangla-first, possibility-driven.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {benefits.map(({ icon: Icon, title, desc }, index) => (
                <div key={title} className="home-benefit-card">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-heading text-lg font-semibold">
                        {title}
                      </h3>
                      <span className="font-mono text-xs text-muted-foreground/60">
                        0{index + 1}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="home-container home-section"
        aria-labelledby="batches-heading"
      >
        <SectionIntro
          id="batches-heading"
          label="LEARN TOGETHER"
          title="A classroom. Wherever you are."
          description="A little structure, a shared goal, and people to learn alongside."
          href="/upComingBatch"
          linkLabel="All upcoming batches"
        />
        {batches.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-3">
            {batches.map((batch) => (
              <Link
                key={batch.id}
                href={`/courseDetails/${batch.course.id}`}
                className="home-batch group"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
                    <span className="size-1.5 rounded-full bg-primary" />{" "}
                    Upcoming batch
                  </span>
                  <Video className="size-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {batch.name ?? "Live learning"}
                </p>
                <h3 className="mt-2 line-clamp-2 font-heading text-xl font-semibold transition-colors group-hover:text-primary">
                  {batch.course.title}
                </h3>
                <div className="mt-auto pt-6">
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-4" />
                      {formatDate(batch.startDate)}
                    </span>
                    {batch.seats !== null && batch.seats > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Users className="size-4" />
                        {batch.seats} seats
                      </span>
                    )}
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm font-semibold text-primary">
                    View batch details{" "}
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-card p-7 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <CalendarDays className="size-6" />
              </span>
              <div>
                <h3 className="font-semibold">
                  Your next class is in the making.
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Explore recorded courses while new batches are being
                  scheduled.
                </p>
              </div>
            </div>
            <Link
              href="/course"
              className="home-button home-button-outline shrink-0"
            >
              Browse courses <ArrowRight className="size-4" />
            </Link>
          </div>
        )}
      </section>

      <section
        className="border-y border-border bg-card/50"
        aria-labelledby="mentors-heading"
      >
        <div className="home-container home-section">
          <SectionIntro
            id="mentors-heading"
            label="REAL PEOPLE. REAL EXPERIENCE."
            title="Meet your next mentor."
            description="Learn from people who have been where you want to go."
            href="/mentorsList"
            linkLabel="Meet all mentors"
          />
          {mentors.length > 0 ? (
            <div
              className={`grid gap-5 sm:grid-cols-2 ${mentors.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
            >
              {mentors.map((mentor, index) => (
                <Link
                  key={mentor.id}
                  href={`/mentorDetails/${mentor.user.id}`}
                  className="home-mentor group"
                >
                  <div
                    className={`home-mentor-portrait home-mentor-tone-${index % 4}`}
                  >
                    {mentor.user.avatarUrl ? (
                      <Image
                        src={mentor.user.avatarUrl}
                        alt={mentor.user.fullName}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="font-heading text-6xl font-bold text-primary/65">
                        {mentor.user.fullName
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                    )}
                    <span className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full bg-card text-primary shadow-sm">
                      <ArrowUpRight className="size-4" />
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-heading text-lg font-semibold group-hover:text-primary">
                      {mentor.user.fullName}
                    </h3>
                    <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">
                      {mentor.headline || "Lumen instructor & learning mentor"}
                    </p>
                    <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                      {mentor.ratingCount > 0 ? (
                        <>
                          <Star className="size-3.5 fill-accent text-accent" />
                          <span className="font-semibold text-foreground">
                            {mentor.ratingAvg.toFixed(1)}
                          </span>
                          <span>
                            ({mentor.ratingCount}{" "}
                            {mentor.ratingCount === 1 ? "review" : "reviews"})
                          </span>
                        </>
                      ) : (
                        <>
                          <Check className="size-3.5 text-primary" /> Approved
                          instructor
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <Users className="mx-auto mb-3 size-7 text-primary" />
              <p className="font-semibold">
                Fresh perspectives are on the way.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Approved mentors will appear here as they join Lumen.
              </p>
            </div>
          )}
          <div className="mt-8 flex flex-col justify-between gap-4 rounded-xl bg-secondary/60 px-6 py-5 sm:flex-row sm:items-center">
            <p className="text-sm">
              <span className="font-semibold">Have experience to share?</span>{" "}
              <span className="text-muted-foreground">
                Help someone take their next step.
              </span>
            </p>
            <Link
              href="/signUp"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary"
            >
              Join as an instructor <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section
        className="home-container home-section"
        aria-labelledby="faq-heading"
      >
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <span className="home-kicker text-primary">A LITTLE CLARITY</span>
            <h2 id="faq-heading" className="home-title mt-4">
              Curious? Good.
              <br />
              Let’s talk.
            </h2>
            <p className="mt-5 max-w-sm leading-7 text-muted-foreground">
              A few answers to help you feel at home before your first lesson.
            </p>
            <Link
              href="/contactUs"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              Still have a question? Get in touch{" "}
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div className="border-t border-border">
            {faqs.map((faq) => (
              <details key={faq.question} className="home-faq group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-sm font-semibold sm:text-base">
                  {faq.question}
                  <Plus className="size-4 shrink-0 text-primary transition-transform group-open:rotate-45" />
                </summary>
                <p className="pb-5 pr-8 text-sm leading-7 text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="home-container pb-16 lg:pb-24">
        <div className="home-final-cta">
          <div className="relative z-10">
            <span className="home-kicker text-white/65">
              YOUR FUTURE IS A WORK IN PROGRESS
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Make room for
              <br />a little growth.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/75">
              One lesson can be the start of something bigger.
              <br className="hidden sm:block" /> Take your first step with
              Lumen.
            </p>
            <Link
              href="/signUp"
              className="home-button mt-7 border-transparent bg-[#f1d878] text-[#203d32] hover:bg-[#f8e6a6]"
            >
              Create your free account <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div className="home-cta-art" aria-hidden="true">
            <Sprout className="size-36 stroke-[1] sm:size-44" />
            <span className="mt-2 font-serif text-xl italic">
              Small steps. Lasting growth.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionIntro({
  id,
  label,
  title,
  description,
  href,
  linkLabel,
}: {
  id: string;
  label: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <span className="home-kicker text-primary">{label}</span>
        <h2 id={id} className="home-title mt-3">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-2 self-start border-b border-primary/30 pb-1 text-sm font-semibold text-primary sm:self-auto"
      >
        {linkLabel}
        <ArrowUpRight className="size-4" />
      </Link>
    </div>
  );
}

function LearningIllustration() {
  return (
    <div
      className="home-learning-scene reveal"
      aria-label="Illustration of a learning journey, from discovering a skill to earning a certificate"
      role="img"
    >
      <div className="home-scene-orbit" />
      <span className="home-scene-spark">
        <Sparkles className="size-8 stroke-[1.5]" />
      </span>
      <div className="home-learning-window">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="size-6 rounded-md bg-primary p-1 text-primary-foreground">
              <BookOpen className="size-4" />
            </span>
            <span className="text-xs font-bold tracking-tight">
              Your learning space
            </span>
          </div>
          <div className="flex gap-1.5">
            <span className="size-1.5 rounded-full bg-border" />
            <span className="size-1.5 rounded-full bg-border" />
            <span className="size-1.5 rounded-full bg-primary/50" />
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                A fresh start
              </p>
              <p className="mt-1 font-heading text-xl font-semibold">
                Hello, possibility.
              </p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-primary">
              <Sprout className="size-5" />
            </span>
          </div>
          <div className="home-lesson-art">
            <div className="home-art-grid" />
            <div className="home-art-circle" />
            <div className="home-art-arch" />
            <span className="absolute left-5 top-5 font-mono text-[9px] uppercase tracking-widest text-white/65">
              Explore · Learn · Create
            </span>
            <div className="absolute bottom-5 left-5">
              <span className="text-[10px] text-white/70">
                Your next lesson
              </span>
              <p className="mt-1 font-heading text-2xl font-semibold text-white">
                Build something
                <br />
                you’re proud of.
              </p>
            </div>
            <span className="absolute bottom-6 right-5 flex size-10 items-center justify-center rounded-full bg-[#f1d878] text-[#244c3d]">
              <Play className="ml-0.5 size-4 fill-current" />
            </span>
          </div>
          <div className="mt-5 flex items-center justify-between text-[10px]">
            <span className="font-semibold">Your learning journey</span>
            <span className="text-muted-foreground">One step at a time</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["Discover", "Practice", "Grow"].map((step, index) => (
              <div
                key={step}
                className="rounded-lg bg-secondary/70 px-2 py-3 text-center"
              >
                <span className="mx-auto mb-2 flex size-5 items-center justify-center rounded-full bg-card text-[9px] font-semibold text-primary">
                  {index + 1}
                </span>
                <p className="text-[10px] font-medium">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="home-scene-note">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f1d878] text-[#244c3d]">
          <Award className="size-5" />
        </span>
        <div>
          <p className="text-xs font-bold">Learn it. Own it.</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Skills that stay with you.
          </p>
        </div>
        <Check className="ml-2 size-4 text-primary" />
      </div>
      <div className="home-scene-label">
        <span className="size-2 rounded-full bg-primary" /> A new chapter awaits
      </div>
    </div>
  );
}
