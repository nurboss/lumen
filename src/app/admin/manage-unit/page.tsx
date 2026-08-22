import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { UnitManager } from "@/components/admin/unit-manager";

export const dynamic = "force-dynamic";

export default async function ManageUnitPage() {
  const units = await prisma.unit.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      section: {
        select: {
          title: true,
          course: { select: { title: true } },
          batch: { select: { name: true, course: { select: { title: true } } } },
        },
      },
    },
  });

  return (
    <div>
      <DashboardHeading title="Units" subtitle="Lessons, live classes and text content inside sections." />
      <UnitManager units={JSON.parse(JSON.stringify(units))} />
    </div>
  );
}
