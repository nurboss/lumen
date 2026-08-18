import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { UnitManager } from "@/components/admin/unit-manager";

export const dynamic = "force-dynamic";

export default async function ManageUnitPage() {
  const [units, sections] = await Promise.all([
    prisma.unit.findMany({
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
    }),
    prisma.section.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        course: { select: { title: true } },
        batch: { select: { name: true, course: { select: { title: true } } } },
      },
    }),
  ]);

  const sectionOptions = sections.map((s) => {
    const parent = s.course
      ? s.course.title
      : s.batch
        ? `${s.batch.course.title} — ${s.batch.name ?? "Batch"}`
        : "Unassigned";
    return { id: s.id, label: `${parent} › ${s.title}` };
  });

  return (
    <div>
      <DashboardHeading title="Units" subtitle="Lessons, live classes and text content inside sections." />
      <UnitManager units={JSON.parse(JSON.stringify(units))} sections={sectionOptions} />
    </div>
  );
}
