import Link from "next/link";
import { Award, Medal } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentCertificatesPage() {
  const user = await getSession();
  const [certificates, badges] = await Promise.all([
    prisma.certificate.findMany({
      where: { userId: user!.id },
      orderBy: { issuedAt: "desc" },
      include: { course: { select: { title: true } } },
    }),
    prisma.badge.findMany({ where: { userId: user!.id }, orderBy: { awardedAt: "desc" } }),
  ]);

  return (
    <div>
      <DashboardHeading title="Certificates & badges" subtitle="Your earned credentials." />

      {certificates.length === 0 && badges.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Complete a course to earn your first certificate.
        </p>
      ) : (
        <div className="space-y-8">
          {certificates.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {certificates.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-5">
                    <Award className="mb-3 h-8 w-8 text-primary" />
                    <p className="font-heading font-semibold text-foreground">
                      {c.course?.title ?? "Certificate"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">Issued {formatDate(c.issuedAt)}</p>
                    <Link
                      href={`/certificate/${c.code}`}
                      className="mt-3 inline-block font-mono text-xs text-primary hover:underline"
                    >
                      {c.code}
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {badges.length > 0 && (
            <div>
              <h2 className="mb-3 font-heading text-lg font-bold">Badges</h2>
              <div className="flex flex-wrap gap-4">
                {badges.map((b) => (
                  <Card key={b.id}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <Medal className="h-6 w-6 text-accent" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{b.title}</p>
                        {b.percentage != null && (
                          <p className="text-xs text-muted-foreground">{b.percentage}%</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
