import { BookOpen, Users, GraduationCap, Newspaper } from "lucide-react";
import prisma from "@/lib/prisma";
import { StatCard, DashboardHeading } from "@/components/dashboard/stat-card";

export default async function AdminDashboard() {
  const [courses, students, instructors, blogs] = await Promise.all([
    prisma.course.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: "STUDENT", deletedAt: null } }),
    prisma.user.count({ where: { role: "INSTRUCTOR", deletedAt: null } }),
    prisma.blog.count({ where: { deletedAt: null } }),
  ]);

  return (
    <div>
      <DashboardHeading title="Admin overview" subtitle="Platform at a glance." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Courses" value={courses} icon={BookOpen} />
        <StatCard label="Students" value={students} icon={Users} />
        <StatCard label="Instructors" value={instructors} icon={GraduationCap} />
        <StatCard label="Blog posts" value={blogs} icon={Newspaper} />
      </div>
    </div>
  );
}
