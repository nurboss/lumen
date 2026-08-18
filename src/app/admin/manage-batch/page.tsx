import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { BatchManager } from "@/components/admin/batch-manager";

export const dynamic = "force-dynamic";

export default async function ManageBatchPage() {
  const [batches, courses] = await Promise.all([
    prisma.batch.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        course: { select: { title: true } },
        _count: { select: { enrollments: true, sections: true } },
      },
    }),
    prisma.course.findMany({
      where: { deletedAt: null },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <div>
      <DashboardHeading title="Batches" subtitle="Schedule course runs with seats and timing." />
      <BatchManager batches={JSON.parse(JSON.stringify(batches))} courses={courses} />
    </div>
  );
}
