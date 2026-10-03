import Link from "next/link";
import { XCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { CertificateDownloadButton } from "@/components/certificate-download-button";
import { CertificatePreview, type CertLayout } from "@/components/certificate-preview";

export const dynamic = "force-dynamic";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cert = await prisma.certificate.findUnique({
    where: { code: decodeURIComponent(code) },
    include: {
      user: { select: { fullName: true, address: true } },
      course: { select: { title: true } },
      template: { select: { layout: true, assetUrl: true } },
    },
  });

  if (!cert) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-8 text-center">
            <XCircle className="mx-auto h-14 w-14 text-destructive" />
            <h1 className="mt-4 font-heading text-2xl font-bold text-foreground">Not found</h1>
            <p className="mt-2 text-muted-foreground">
              No certificate matches the code <code className="font-mono">{decodeURIComponent(code)}</code>.
            </p>
            <Link href="/certificate" className={`${buttonVariants({ variant: "outline" })} mt-8`}>
              Verify another
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const region = cert.user.address?.trim() || "—";
  const result = cert.passingPercentage != null ? `${cert.passingPercentage}%` : "—";
  const vars = {
    name: cert.user.fullName,
    course: cert.course?.title ?? "the course",
    code: cert.code,
    region,
    result,
    date: formatDate(cert.issuedAt),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 print:p-0">
      <style>{`@media print { @page { size: A4 landscape; margin: 0; } }`}</style>

      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="font-heading text-xl font-bold text-foreground">Certificate</h1>
        <CertificateDownloadButton targetId="certificate-sheet" fileName={cert.code} />
      </div>

      <div id="certificate-sheet">
        <CertificatePreview
          layout={(cert.template?.layout as CertLayout) ?? null}
          vars={vars}
          assetUrl={cert.template?.assetUrl}
        />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground print:hidden">
        Verify at <code className="font-mono">/certificate/{cert.code}</code>
      </p>
    </div>
  );
}
