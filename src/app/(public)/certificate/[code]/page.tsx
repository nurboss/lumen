import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CertificateVerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cert = await prisma.certificate.findUnique({
    where: { code: decodeURIComponent(code) },
    include: {
      user: { select: { fullName: true } },
      course: { select: { title: true } },
    },
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="p-8 text-center">
          {cert ? (
            <>
              <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
              <h1 className="mt-4 font-heading text-2xl font-bold text-foreground">Certificate verified</h1>
              <p className="mt-4 text-muted-foreground">
                This certificate was issued to
              </p>
              <p className="font-heading text-xl font-bold text-foreground">{cert.user.fullName}</p>
              {cert.course && (
                <p className="mt-2 text-muted-foreground">
                  for completing <strong className="text-foreground">{cert.course.title}</strong>
                </p>
              )}
              <div className="mt-6 flex flex-col gap-1 text-sm text-muted-foreground">
                <span>Code: <code className="font-mono">{cert.code}</code></span>
                <span>Issued: {formatDate(cert.issuedAt)}</span>
                {cert.passingPercentage != null && <span>Score: {cert.passingPercentage}%</span>}
              </div>
            </>
          ) : (
            <>
              <XCircle className="mx-auto h-14 w-14 text-destructive" />
              <h1 className="mt-4 font-heading text-2xl font-bold text-foreground">Not found</h1>
              <p className="mt-2 text-muted-foreground">
                No certificate matches the code <code className="font-mono">{decodeURIComponent(code)}</code>.
              </p>
            </>
          )}
          <Link href="/certificate" className={`${buttonVariants({ variant: "outline" })} mt-8`}>
            Verify another
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
