import { BookOpen, CalendarClock, ClipboardList } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { StatCard, DashboardHeading } from "@/components/dashboard/stat-card";

export default async function InstructorDashboard() {
  const user = await getSession();
  const authorId = user!.id;

  const [courses, batches, assignments] = await Promise.all([
    prisma.course.count({ where: { authorId, deletedAt: null } }),
    prisma.batch.count({ where: { createdById: authorId, deletedAt: null } }),
    prisma.assignment.count({ where: { authorId } }),
  ]);

  return (
    <div>
      <DashboardHeading title={`Welcome, ${user!.fullName}`} subtitle="Your teaching at a glance." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="My courses" value={courses} icon={BookOpen} />
        <StatCard label="My batches" value={batches} icon={CalendarClock} />
        <StatCard label="Assignments" value={assignments} icon={ClipboardList} />
      </div>
    </div>
  );
}
