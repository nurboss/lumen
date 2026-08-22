import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { SectionManager } from "@/components/admin/section-manager";

export const dynamic = "force-dynamic";

export default async function ManageSectionPage() {
  const [sections, courses, batches, units, quizzes, assignments] = await Promise.all([
    prisma.section.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: {
        course: { select: { title: true } },
        batch: { select: { name: true, course: { select: { title: true } } } },
        items: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            kind: true,
            unit: { select: { id: true, title: true } },
            quiz: { select: { id: true, title: true } },
            assignment: { select: { id: true, title: true } },
          },
        },
      },
    }),
    prisma.course.findMany({ where: { deletedAt: null }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.batch.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, course: { select: { title: true } } },
    }),
    prisma.unit.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true, sectionId: true } }),
    prisma.quiz.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.assignment.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <div>
      <DashboardHeading title="Sections" subtitle="Arrange units, quizzes and assignments into an ordered curriculum." />
      <SectionManager
        sections={JSON.parse(JSON.stringify(sections))}
        courses={courses}
        batches={batches.map((b) => ({ id: b.id, label: `${b.course.title} — ${b.name ?? "Batch"}` }))}
        units={units}
        quizzes={quizzes}
        assignments={assignments}
      />
    </div>
  );
}
