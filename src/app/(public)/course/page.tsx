import Link from "next/link";
import { Search } from "lucide-react";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/src/generated/prisma/client";
import { CourseCard } from "@/components/course-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const revalidate = 60;

const PAGE_SIZE = 12;

interface SearchParams {
  q?: string;
  category?: string;
  page?: string;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const categorySlug = sp.category ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.CourseWhereInput = {
    status: "PUBLISHED",
    deletedAt: null,
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
  };

  const [categories, total, courses] = await Promise.all([
    prisma.courseCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: { select: { name: true } },
        author: { select: { fullName: true } },
        _count: { select: { reviews: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (patch: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const merged = { q, category: categorySlug, page: String(page), ...patch };
    if (merged.q) params.set("q", merged.q);
    if (merged.category) params.set("category", merged.category);
    if (merged.page && merged.page !== "1") params.set("page", merged.page);
    const s = params.toString();
    return `/course${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="eyebrow">Course catalog</span>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">All courses</h1>

      {/* Search */}
      <form action="/course" method="get" className="mt-6 flex gap-2">
        {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search courses…" className="pl-9" />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* Category chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={buildHref({ category: "", page: "1" })}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            !categorySlug ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/50"
          )}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={buildHref({ category: c.slug, page: "1" })}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              categorySlug === c.slug ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/50"
            )}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {/* Results */}
      <p className="mt-6 text-sm text-muted-foreground">{total} course{total === 1 ? "" : "s"} found</p>
      {courses.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No courses match your search.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          <Link
            href={buildHref({ page: String(Math.max(1, page - 1)) })}
            aria-disabled={page === 1}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), page === 1 && "pointer-events-none opacity-50")}
          >
            Previous
          </Link>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Link
            href={buildHref({ page: String(Math.min(totalPages, page + 1)) })}
            aria-disabled={page === totalPages}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), page === totalPages && "pointer-events-none opacity-50")}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
