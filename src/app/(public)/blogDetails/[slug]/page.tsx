import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export const revalidate = 60;

export default async function BlogDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blog = await prisma.blog.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    include: { category: { select: { name: true } } },
  });

  if (!blog) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {blog.category && <Badge variant="secondary" className="mb-4">{blog.category.name}</Badge>}
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">{blog.title}</h1>
      {blog.subtitle && <p className="mt-3 text-lg text-muted-foreground">{blog.subtitle}</p>}
      <p className="mt-4 text-sm text-muted-foreground">{formatDate(blog.createdAt)}</p>
      <div
        className="prose prose-sm mt-8 max-w-none text-foreground"
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />
    </article>
  );
}
