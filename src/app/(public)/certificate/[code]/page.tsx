import Link from "next/link";
import { XCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { CertificateDownloadButton } from "@/components/certificate-download-button";

export const dynamic = "force-dynamic";

interface CertLayout {
  title?: string;
  body?: string;
  signatureName?: string;
  signatureTitle?: string;
  accentColor?: string;
}

const DEFAULT_LAYOUT: Required<CertLayout> = {
  title: "Certificate of Completion",
  body: "This is to certify that {name} has successfully completed {course}.",
  signatureName: "",
  signatureTitle: "",
  accentColor: "#4f46e5",
};

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

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

  const layout: Required<CertLayout> = {
    ...DEFAULT_LAYOUT,
    ...((cert.template?.layout as CertLayout) ?? {}),
  };
  const region = cert.user.address?.trim() || "—";
  const vars = {
    name: cert.user.fullName,
    course: cert.course?.title ?? "the course",
    code: cert.code,
    region,
    date: formatDate(cert.issuedAt),
  };
  const accent = layout.accentColor || "#4f46e5";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="font-heading text-xl font-bold text-foreground">Certificate</h1>
        <CertificateDownloadButton />
      </div>

      {/* Printable certificate */}
      <div
        className="relative mx-auto overflow-hidden rounded-xl border bg-white p-10 text-center text-slate-900 shadow-sm sm:p-16 print:rounded-none print:border-0 print:shadow-none"
        style={{
          borderColor: accent,
          borderWidth: 6,
          backgroundImage: cert.template?.assetUrl ? `url(${cert.template.assetUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: accent }}>
          {layout.title}
        </p>

        <p className="mt-10 text-lg text-slate-600">This is proudly presented to</p>
        <p className="mt-2 font-heading text-4xl font-bold sm:text-5xl">{cert.user.fullName}</p>

        <p className="mx-auto mt-6 max-w-xl text-base text-slate-600">{fill(layout.body, vars)}</p>

        <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-end justify-between gap-6 text-left">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Serial number</p>
            <p className="font-mono text-sm font-semibold">{cert.code}</p>
            <p className="mt-3 text-xs uppercase tracking-wider text-slate-500">Region</p>
            <p className="text-sm font-semibold">{region}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-slate-500">Issued</p>
            <p className="text-sm font-semibold">{formatDate(cert.issuedAt)}</p>
            {layout.signatureName && (
              <div className="mt-4">
                <p className="border-t border-slate-300 pt-1 font-heading text-base font-semibold">
                  {layout.signatureName}
                </p>
                {layout.signatureTitle && (
                  <p className="text-xs text-slate-500">{layout.signatureTitle}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground print:hidden">
        Verify at <code className="font-mono">/certificate/{cert.code}</code>
      </p>
    </div>
  );
}
