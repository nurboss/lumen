import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Search,
  SlidersHorizontal,
  Video,
  Users,
  Award,
  Compass,
  ChevronLeft,
  ChevronRight,
  X,
  Sprout,
} from "lucide-react";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/src/generated/prisma/client";
import { CourseCard } from "@/components/course-card";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { getAvailableBatches } from "@/lib/batches";
import { BatchCard } from "@/components/batch-card";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 12;
const levels = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
] as const;
interface SearchParams {
  q?: string;
  category?: string;
  page?: string;
  level?: string;
  price?: string;
  sort?: string;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const level = levels.find((item) => item.value === sp.level)?.value ?? "";
  const price = sp.price === "free" || sp.price === "paid" ? sp.price : "";
  const sort = sp.sort === "title" || sp.sort === "oldest" ? sp.sort : "newest";
  const requestedPage = Number(sp.page);
  const requested =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const published: Prisma.CourseWhereInput = {
    status: "PUBLISHED",
    deletedAt: null,
  };
  const where: Prisma.CourseWhereInput = {
    ...published,
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(level ? { level } : {}),
    ...(price ? { isFree: price === "free" } : {}),
  };
  const user = await getSession();
  const [categories, total, batches] = await Promise.all([
    prisma.courseCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { courses: { where: published } } },
      },
    }),
    prisma.course.count({ where }),
    getAvailableBatches(user?.id, { course: where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requested, totalPages);
  const courses = await prisma.course.findMany({
    where,
    orderBy:
      sort === "title"
        ? [{ title: "asc" }, { id: "asc" }]
        : [{ createdAt: sort === "oldest" ? "asc" : "desc" }, { id: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      category: { select: { name: true } },
      author: { select: { fullName: true } },
      _count: {
        select: {
          reviews: true,
          enrollments: { where: { status: { in: ["ACTIVE", "COMPLETED"] } } },
        },
      },
    },
  });
  const selectedCategory = categories.find((item) => item.slug === category);
  const hasFilters = Boolean(q || category || level || price);
  const buildHref = (patch: Partial<SearchParams> = {}) => {
    const merged = {
      q,
      category,
      level,
      price,
      sort,
      page: String(page),
      ...patch,
    };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(merged))
      if (
        value &&
        !(key === "page" && value === "1") &&
        !(key === "sort" && value === "newest")
      )
        params.set(key, value);
    return `/course${params.size ? `?${params}` : ""}`;
  };
  const hiddenInputs = (omit: string[]) =>
    Object.entries({ q, category, level, price, sort })
      .filter(([key, value]) => value && !omit.includes(key))
      .map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ));

  return (
    <div className="course-catalog">
      <section className="catalog-hero border-b border-border">
        <div className="home-container py-10 lg:py-14">
          <nav
            aria-label="Breadcrumb"
            className="mb-7 flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <ChevronRight className="size-3" />
            <span aria-current="page">Courses</span>
          </nav>
          <div className="flex items-center justify-between gap-8">
            <div className="max-w-2xl reveal">
              <span className="home-kicker text-primary">
                <span className="size-1.5 rounded-full bg-primary" /> FOLLOW
                YOUR CURIOSITY
              </span>
              <h1 className="mt-4 font-heading text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
                Small steps.
                <br />{" "}
                <span className="home-highlight">Bigger possibilities.</span>
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
                Find the course that meets you where you are, and takes you
                where you want to go. Your next chapter is waiting.
              </p>
            </div>
            <div className="catalog-hero-art" aria-hidden="true">
              <div className="catalog-art-orbit" />
              <div className="catalog-art-book">
                <BookOpen className="size-16 stroke-[1]" />
                <span className="mt-4 font-heading text-xl font-semibold">
                  Stay curious.
                </span>
                <span className="mt-2 text-[10px] uppercase tracking-widest">
                  Keep growing.
                </span>
              </div>
              <span className="catalog-art-sprout">
                <Sprout className="size-7" />
              </span>
            </div>
          </div>
          <form
            action="/course"
            method="get"
            className="home-search mt-8 max-w-2xl"
          >
            {hiddenInputs(["q"])}
            <Search
              className="size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <label htmlFor="catalog-search" className="sr-only">
              Search courses
            </label>
            <input
              id="catalog-search"
              key={q}
              name="q"
              type="search"
              defaultValue={q}
              placeholder="What would you like to learn?"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
            />
            <button type="submit" className="home-button px-4 sm:px-6">
              Search <ArrowRight className="hidden size-4 sm:block" />
            </button>
          </form>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <BookOpen className="size-3.5 text-primary" /> Learn at your pace
            </span>
            <span className="flex items-center gap-2">
              <Users className="size-3.5 text-primary" /> Expert-led learning
            </span>
            <span className="flex items-center gap-2">
              <Award className="size-3.5 text-primary" /> Verifiable
              certificates
            </span>
          </div>
        </div>
      </section>

      <div className="home-container grid gap-8 py-10 lg:grid-cols-[235px_minmax(0,1fr)] lg:gap-10 lg:py-14">
        <aside aria-label="Course filters" className="min-w-0">
          <div className="catalog-filter-panel">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal className="size-4 text-primary" /> Refine
                your search
              </h2>
              {hasFilters && (
                <Link
                  href="/course"
                  className="text-xs text-primary underline underline-offset-4"
                >
                  Reset
                </Link>
              )}
            </div>
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Subject
            </h3>
            <nav
              aria-label="Course categories"
              className="flex flex-wrap gap-1 lg:flex-col"
            >
              <Link
                href={buildHref({ category: "", page: "1" })}
                aria-current={!category ? "page" : undefined}
                className={cn(
                  "catalog-category",
                  !category && "catalog-category-active",
                )}
              >
                <span className="flex items-center gap-2">
                  <Compass className="size-4" /> All subjects
                </span>
              </Link>
              {categories.map((item) => (
                <Link
                  key={item.id}
                  href={buildHref({ category: item.slug, page: "1" })}
                  aria-current={category === item.slug ? "page" : undefined}
                  className={cn(
                    "catalog-category",
                    category === item.slug && "catalog-category-active",
                  )}
                >
                  <span>{item.name}</span>
                  <span className="font-mono text-[10px] opacity-65">
                    {item._count.courses}
                  </span>
                </Link>
              ))}
            </nav>
            <form
              key={`${level}-${price}`}
              action="/course"
              method="get"
              className="mt-5 border-t border-border pt-5"
            >
              {hiddenInputs(["level", "price"])}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
                <div>
                  <label
                    htmlFor="filter-level"
                    className="catalog-filter-label"
                  >
                    Experience level
                  </label>
                  <select
                    id="filter-level"
                    name="level"
                    defaultValue={level}
                    className="catalog-select mt-2 w-full"
                  >
                    <option value="">All levels</option>
                    {levels.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="filter-price"
                    className="catalog-filter-label"
                  >
                    Price
                  </label>
                  <select
                    id="filter-price"
                    name="price"
                    defaultValue={price}
                    className="catalog-select mt-2 w-full"
                  >
                    <option value="">All prices</option>
                    <option value="free">Free courses</option>
                    <option value="paid">Paid courses</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="home-button mt-5 min-h-10 w-full py-2 text-xs"
              >
                Apply filters <ArrowRight className="size-3.5" />
              </button>
            </form>
          </div>
          <div className="mt-5 hidden rounded-2xl border border-primary/15 bg-secondary/50 p-5 lg:block">
            <span className="flex size-9 items-center justify-center rounded-xl bg-card text-primary">
              <Compass className="size-5" />
            </span>
            <h3 className="mt-4 font-heading text-lg font-semibold">
              Not sure where to start?
            </h3>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              A little guidance can go a long way. Find a mentor to help with
              your next step.
            </p>
            <Link
              href="/mentorsList"
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary"
            >
              Meet the mentors <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </aside>

        <div className="min-w-0">
          <section aria-labelledby="catalog-results-heading">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2
                  id="catalog-results-heading"
                  className="font-heading text-2xl font-semibold"
                >
                  {selectedCategory?.name ?? "Explore the courses"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {total === 0
                    ? "No courses found"
                    : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} ${total === 1 ? "course" : "courses"}`}
                  {q && (
                    <>
                      {" "}
                      for{" "}
                      <span className="font-medium text-foreground">“{q}”</span>
                    </>
                  )}
                </p>
              </div>
              <form
                action="/course"
                method="get"
                className="flex items-center gap-2"
              >
                {hiddenInputs(["sort"])}
                <label
                  htmlFor="course-sort"
                  className="shrink-0 text-xs text-muted-foreground"
                >
                  Sort by
                </label>
                <select
                  key={sort}
                  id="course-sort"
                  name="sort"
                  defaultValue={sort}
                  className="catalog-select"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">Course name</option>
                </select>
                <button
                  type="submit"
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary transition-colors hover:bg-secondary"
                  aria-label="Apply sorting"
                >
                  <ArrowRight className="size-4" />
                </button>
              </form>
            </div>
            {hasFilters && (
              <div
                className="mb-6 flex flex-wrap items-center gap-2"
                aria-label="Active filters"
              >
                <span className="mr-1 text-xs text-muted-foreground">
                  Filtered by
                </span>
                {q && (
                  <FilterChip
                    label={q}
                    href={buildHref({ q: "", page: "1" })}
                  />
                )}
                {category && (
                  <FilterChip
                    label={selectedCategory?.name ?? category}
                    href={buildHref({ category: "", page: "1" })}
                  />
                )}
                {level && (
                  <FilterChip
                    label={levels.find((item) => item.value === level)!.label}
                    href={buildHref({ level: "", page: "1" })}
                  />
                )}
                {price && (
                  <FilterChip
                    label={price === "free" ? "Free" : "Paid"}
                    href={buildHref({ price: "", page: "1" })}
                  />
                )}
              </div>
            )}
            {courses.length > 0 ? (
              <div className="home-course-grid catalog-course-grid grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    appearance="catalog"
                  />
                ))}
              </div>
            ) : (
              <div className="catalog-empty">
                <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <Search className="size-7 stroke-[1.5]" />
                </span>
                <h3 className="mt-5 font-heading text-2xl font-semibold">
                  {hasFilters
                    ? "Let’s try a different direction."
                    : "A new chapter is on its way."}
                </h3>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
                  {hasFilters
                    ? "Try another search or broaden your filters. Your next learning opportunity might be just around the corner."
                    : "Published courses will appear here as they become available. Explore our mentors in the meantime."}
                </p>
                <Link
                  href={hasFilters ? "/course" : "/mentorsList"}
                  className="home-button mt-6"
                >
                  {hasFilters ? "Clear filters & explore" : "Meet the mentors"}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            )}
            {totalPages > 1 && (
              <nav
                aria-label="Course pagination"
                className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6"
              >
                {page > 1 ? (
                  <Link
                    href={buildHref({ page: String(page - 1) })}
                    className="catalog-page-link"
                  >
                    <ChevronLeft className="size-4" /> Previous
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="catalog-page-link opacity-40"
                  >
                    <ChevronLeft className="size-4" /> Previous
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Page <strong className="text-foreground">{page}</strong> of{" "}
                  {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={buildHref({ page: String(page + 1) })}
                    className="catalog-page-link"
                  >
                    Next <ChevronRight className="size-4" />
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="catalog-page-link opacity-40"
                  >
                    Next <ChevronRight className="size-4" />
                  </span>
                )}
              </nav>
            )}
          </section>

          <section
            className="mt-12 border-t border-border pt-9"
            aria-labelledby="batch-courses-heading"
          >
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <span className="home-kicker text-primary">
                  <Video className="size-3.5" /> LEARN WITH A CLASS
                </span>
                <h2
                  id="batch-courses-heading"
                  className="mt-3 font-heading text-2xl font-semibold"
                >
                  A shared goal. A little momentum.
                </h2>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {batches.length > 0
                    ? `${batches.length} available ${batches.length === 1 ? "batch" : "batches"} matching your preferences. Find your class and learn together.`
                    : "Prefer a scheduled class? Explore our live learning opportunities."}
                </p>
              </div>
              <Link
                href="/upComingBatch"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary"
              >
                All batches <ArrowUpRight className="size-4" />
              </Link>
            </div>
            {batches.length > 0 ? (
              <div
                className={cn(
                  "catalog-batch-grid grid gap-5 sm:grid-cols-2 xl:grid-cols-3",
                  batches.length === 1 && "catalog-single-batch",
                )}
              >
                {batches.map((batch) => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    isAuthed={Boolean(user)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-4 rounded-xl border border-dashed border-border bg-card/60 p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Video className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    {hasFilters
                      ? "No batches match these filters yet."
                      : "The next class is in the making."}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    {hasFilters
                      ? "Broaden your filters or check all upcoming batches for more options."
                      : "Keep exploring courses, or check back for new batch schedules."}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      <section className="home-container pb-14">
        <div className="flex flex-col justify-between gap-5 rounded-2xl border border-border bg-secondary/40 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex items-center gap-4">
            <Sprout className="size-9 shrink-0 text-primary stroke-[1.5]" />
            <div>
              <h2 className="font-heading text-xl font-semibold">
                Your next step doesn’t have to be a big one.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Start with a little curiosity. We’ll help you find your way.
              </p>
            </div>
          </div>
          <Link
            href="/mentorsList"
            className="home-button home-button-outline shrink-0"
          >
            Find your mentor <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function FilterChip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      aria-label={`Remove ${label} filter`}
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/15 bg-secondary/70 px-3 py-1.5 text-xs font-medium text-primary hover:bg-secondary"
    >
      <span className="max-w-48 truncate">{label}</span>
      <X className="size-3 shrink-0" />
    </Link>
  );
}
