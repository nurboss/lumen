import Link from "next/link";
import {
  BookOpen,
  Star,
  Code2,
  Palette,
  ChartNoAxesCombined,
  Sparkles,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBdt, effectivePrice } from "@/lib/format";

export interface CourseCardData {
  id: string;
  slug: string;
  title: string;
  shortTitle: string | null;
  thumbnailUrl: string | null;
  isFree: boolean;
  sellPrice: number;
  regularPrice: number;
  level: string;
  category?: { name: string } | null;
  author?: { fullName: string } | null;
  _count?: { enrollments?: number; reviews?: number };
}

export function CourseCard({
  course,
  appearance = "default",
}: {
  course: CourseCardData;
  appearance?: "default" | "home" | "catalog";
}) {
  const price = effectivePrice(course);
  const hasDiscount =
    !course.isFree &&
    course.sellPrice > 0 &&
    course.sellPrice < course.regularPrice;
  const categoryName = course.category?.name ?? "Learning";
  const category = categoryName.toLowerCase();
  const CoverIcon = /design|art/.test(category)
    ? Palette
    : /web|code|development/.test(category)
      ? Code2
      : /data|science/.test(category)
        ? ChartNoAxesCombined
        : BookOpen;
  const coverTone = /design|art/.test(category)
    ? "gold"
    : /data|science/.test(category)
      ? "sage"
      : "green";

  return (
    <Link href={`/courseDetails/${course.id}`} className="group">
      <Card className="h-full overflow-hidden pt-0 transition-shadow hover:shadow-md">
        <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15">
          {course.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="h-full w-full object-cover"
            />
          ) : appearance !== "default" ? (
            <div
              className={`home-course-art home-course-art-${coverTone}`}
              aria-hidden="true"
            >
              <span className="home-cover-orbit" />
              <span className="home-cover-book">
                <CoverIcon className="size-8 stroke-[1.5]" />
                <span className="home-cover-rule" />
                <span className="home-cover-rule short" />
              </span>
              <Sparkles className="absolute right-5 top-5 size-5 opacity-50" />
              <span className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-widest">
                {categoryName}
              </span>
            </div>
          ) : (
            <BookOpen className="h-10 w-10 text-primary/50" />
          )}
          {course.isFree ? (
            <Badge className="absolute left-3 top-3">Free</Badge>
          ) : hasDiscount ? (
            <Badge variant="destructive" className="absolute left-3 top-3">
              Sale
            </Badge>
          ) : null}
        </div>
        <CardContent className="p-4">
          {appearance === "catalog" && (
            <div className="mb-3 flex items-center justify-between gap-2 text-[10px] font-medium text-muted-foreground">
              <span className="rounded-md bg-secondary px-2 py-1 text-primary">
                {course.level.charAt(0) + course.level.slice(1).toLowerCase()}
              </span>
              <span className="inline-flex items-center gap-1">
                <BookOpen className="size-3" /> Course
              </span>
            </div>
          )}
          {course.category && (
            <p className="mb-1 text-xs text-muted-foreground">
              {course.category.name}
            </p>
          )}
          <h3 className="mb-2 line-clamp-2 font-heading font-semibold text-foreground group-hover:text-primary">
            {course.title}
          </h3>
          {course.author && (
            <p className="mb-3 text-xs text-muted-foreground">
              by {course.author.fullName}
            </p>
          )}
          {appearance === "catalog" &&
            course._count?.enrollments !== undefined && (
              <p className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="size-3.5" />
                {course._count.enrollments > 0
                  ? `${course._count.enrollments} ${course._count.enrollments === 1 ? "learner" : "learners"}`
                  : "Be one of the first to join"}
              </p>
            )}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              {course.isFree ? (
                <span className="font-bold text-primary">Free</span>
              ) : (
                <>
                  <span className="font-bold text-foreground">
                    {formatBdt(price)}
                  </span>
                  {hasDiscount && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatBdt(course.regularPrice)}
                    </span>
                  )}
                </>
              )}
            </div>
            {course._count?.reviews !== undefined &&
              course._count.reviews > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                  {course._count.reviews}
                  {appearance === "catalog" && " reviews"}
                </span>
              )}
          </div>
          {appearance === "catalog" && (
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs font-semibold text-primary">
              Explore course{" "}
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
