import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { CertificateManager, type CertTemplate } from "@/components/admin/certificate-manager";

export const dynamic = "force-dynamic";

export default async function ManageCertificatePage() {
  const templates = await prisma.certificateTemplate.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      assetUrl: true,
      layout: true,
      _count: { select: { courses: true, certificates: true } },
    },
  });

  const rows: CertTemplate[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    assetUrl: t.assetUrl,
    layout: (t.layout as CertTemplate["layout"]) ?? null,
    courseCount: t._count.courses,
    issuedCount: t._count.certificates,
  }));

  return (
    <div>
      <DashboardHeading
        title="Certificates"
        subtitle="Design certificate templates, then link one to a course in the course editor. Students receive it automatically on completion."
      />
      <CertificateManager templates={rows} />
    </div>
  );
}
