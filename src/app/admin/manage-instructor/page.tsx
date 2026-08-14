import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { UsersTable } from "@/components/admin/users-table";

export const dynamic = "force-dynamic";

export default async function ManageInstructorPage() {
  const [pending, active] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["INSTRUCTOR", "AGENT"] }, status: "PENDING", deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, fullName: true, email: true, phoneNumber: true, role: true, status: true },
    }),
    prisma.user.findMany({
      where: { role: "INSTRUCTOR", status: "ACTIVE", deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, fullName: true, email: true, phoneNumber: true, role: true, status: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <DashboardHeading title="Instructor approvals" subtitle="Pending instructor & agent applications." />
        <UsersTable users={pending} />
      </div>
      <div>
        <h2 className="mb-3 font-heading text-lg font-bold text-foreground">Active instructors</h2>
        <UsersTable users={active} />
      </div>
    </div>
  );
}
