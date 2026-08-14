import Link from "next/link";
import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export const revalidate = 60;

export default async function BlogListPage() {
  const blogs = await prisma.blog.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { category: { select: { name: true } } },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="eyebrow">From the blog</span>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">Articles &amp; tutorials</h1>

      {blogs.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No articles published yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.map((b) => (
            <Link key={b.id} href={`/blogDetails/${b.slug}`} className="group">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  {b.category && <p className="mb-2 text-xs text-muted-foreground">{b.category.name}</p>}
                  <h2 className="mb-2 line-clamp-2 font-heading font-semibold group-hover:text-primary">{b.title}</h2>
                  {b.subtitle && <p className="line-clamp-3 text-sm text-muted-foreground">{b.subtitle}</p>}
                  <p className="mt-3 text-xs text-muted-foreground">{formatDate(b.createdAt)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
