import { BookOpen, Award, FileQuestion } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { StatCard, DashboardHeading } from "@/components/dashboard/stat-card";

export default async function StudentDashboard() {
  const user = await getSession();
  const userId = user!.id;

  const [enrollments, certificates, quizResults] = await Promise.all([
    prisma.enrollment.count({ where: { userId } }),
    prisma.certificate.count({ where: { userId } }),
    prisma.quizResult.count({ where: { userId } }),
  ]);

  return (
    <div>
      <DashboardHeading title={`Welcome, ${user!.fullName}`} subtitle="Your learning at a glance." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Enrolled courses" value={enrollments} icon={BookOpen} />
        <StatCard label="Certificates" value={certificates} icon={Award} />
        <StatCard label="Quizzes taken" value={quizResults} icon={FileQuestion} />
      </div>
    </div>
  );
}
