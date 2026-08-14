import Link from "next/link";
import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { formatDate } from "@/lib/format";

export const revalidate = 300;

export default async function CareerPage() {
  const jobs = await prisma.jobPost.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="eyebrow">Join us</span>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">Careers at Lumen</h1>

      {jobs.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No open positions right now.</p>
      ) : (
        <div className="mt-8 space-y-4">
          {jobs.map((j) => (
            <Link key={j.id} href={`/careerDetails/${j.slug}`} className="group block">
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <h2 className="font-heading font-semibold text-foreground group-hover:text-primary">{j.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {j.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {j.location}</span>}
                    {j.deadline && <span>Apply by {formatDate(j.deadline)}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
