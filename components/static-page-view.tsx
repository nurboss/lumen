import prisma from "@/lib/prisma";

export async function StaticPageView({ slug, fallbackTitle }: { slug: string; fallbackTitle: string }) {
  const page = await prisma.staticPage.findUnique({ where: { slug } });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
        {page?.title ?? fallbackTitle}
      </h1>
      {page ? (
        <div
          className="prose prose-sm mt-8 max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      ) : (
        <p className="mt-8 text-muted-foreground">This page has not been configured yet.</p>
      )}
    </div>
  );
}
