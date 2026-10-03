import prisma from "@/lib/prisma";
import { requireDashboard } from "@/lib/dashboard";
import { instructorUnitWhere } from "@/lib/content-access";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { CourseManager } from "@/components/admin/course-manager";

export const dynamic = "force-dynamic";

export default async function ManageCoursePage() {
  const user = await requireDashboard(["INSTRUCTOR"]);
  const [courses, categories, authors, certificateTemplates, quizzes, assignments, units] =
    await Promise.all([
      prisma.course.findMany({
        where: { deletedAt: null, authorId: user.id },
        orderBy: { createdAt: "desc" },
        include: {
          category: { select: { name: true } },
          author: { select: { fullName: true } },
          instructors: {
            orderBy: { order: "asc" },
            select: { userId: true, category: true },
          },
          // Ordered curriculum so the edit dialog can show the existing
          // sections and their units / quizzes / assignments.
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
          _count: { select: { enrollments: true } },
        },
      }),
      prisma.courseCategory.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.user.findMany({
        where: { id: user.id, deletedAt: null },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true },
      }),
      prisma.certificateTemplate.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.quiz.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true },
      }),
      prisma.assignment.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true },
      }),
      prisma.unit.findMany({
        where: instructorUnitWhere(user.id),
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

  const courseOptions = courses.map((c) => ({ id: c.id, title: c.title }));

  return (
    <div>
      <DashboardHeading title="Courses" subtitle="Create and manage your courses." />
      <CourseManager
        courses={JSON.parse(JSON.stringify(courses))}
        categories={categories}
        authors={authors}
        certificateTemplates={certificateTemplates}
        courseOptions={courseOptions}
        units={units}
        quizzes={quizzes}
        assignments={assignments}
      />
    </div>
  );
}

