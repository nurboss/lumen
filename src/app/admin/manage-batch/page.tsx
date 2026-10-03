import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { BatchManager } from "@/components/admin/batch-manager";

export const dynamic = "force-dynamic";

export default async function ManageBatchPage() {
  const [batches, courses, quizzes, assignments, units] = await Promise.all([
    prisma.batch.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        course: { select: { title: true, status: true, deletedAt: true } },
        _count: { select: { enrollments: { where: { status: { in: ["ACTIVE", "COMPLETED"] } } }, sections: true } },
        // Ordered curriculum so the edit dialog can show the existing sections
        // and their units / quizzes / assignments.
        sections: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            items: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                kind: true,
                unit: { select: { title: true, type: true } },
                quiz: { select: { title: true } },
                assignment: { select: { title: true } },
              },
            },
          },
        },
      },
    }),
    prisma.course.findMany({
      where: { deletedAt: null },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.quiz.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.assignment.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.unit.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        description: true,
        isFree: true,
        publicVideoUrl: true,
        storageVideoUrl: true,
      },
    }),
  ]);

  return (
    <div>
      <DashboardHeading title="Batches" subtitle="Schedule course runs with seats and timing." />
      <BatchManager
        batches={JSON.parse(JSON.stringify(batches))}
        courses={courses}
        units={units}
        quizzes={quizzes}
        assignments={assignments}
      />
    </div>
  );
}
