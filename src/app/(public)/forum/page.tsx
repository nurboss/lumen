import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ThumbsUp } from "lucide-react";
import { formatDate } from "@/lib/format";

export const revalidate = 30;

export default async function ForumPage() {
  const posts = await prisma.publicForumPost.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      author: { select: { fullName: true } },
      _count: { select: { comments: true, likes: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="eyebrow">Community</span>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">Public Q&amp;A forum</h1>

      {posts.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No questions yet. Be the first to ask!</p>
      ) : (
        <div className="mt-8 space-y-4">
          {posts.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-5">
                <h2 className="font-heading font-semibold text-foreground">{p.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.body}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{p.author.fullName}</span>
                  <span>·</span>
                  <span>{formatDate(p.createdAt)}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {p._count.comments}</span>
                  <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {p._count.likes}</span>
                  {p.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[0.65rem]">{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
