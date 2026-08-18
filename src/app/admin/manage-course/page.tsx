import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { CourseManager } from "@/components/admin/course-manager";

export const dynamic = "force-dynamic";

export default async function ManageCoursePage() {
  const [courses, categories, authors, certificateTemplates, quizzes, assignments] =
    await Promise.all([
      prisma.course.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          category: { select: { name: true } },
          author: { select: { fullName: true } },
          instructors: {
            orderBy: { order: "asc" },
            select: { userId: true, category: true },
          },
          _count: { select: { enrollments: true } },
        },
      }),
      prisma.courseCategory.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.user.findMany({
        where: { deletedAt: null, role: { in: ["ADMIN", "INSTRUCTOR"] } },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true },
      }),
      prisma.certificateTemplate.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.quiz.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true },
      }),
      prisma.assignment.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true },
      }),
    ]);

  const courseOptions = courses.map((c) => ({ id: c.id, title: c.title }));

  return (
    <div>
      <DashboardHeading title="Courses" subtitle="Create and manage courses on the platform." />
      <CourseManager
        courses={JSON.parse(JSON.stringify(courses))}
        categories={categories}
        authors={authors}
        certificateTemplates={certificateTemplates}
        courseOptions={courseOptions}
        quizzes={quizzes}
        assignments={assignments}
      />
    </div>
  );
}
