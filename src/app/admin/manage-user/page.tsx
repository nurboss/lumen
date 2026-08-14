import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { UsersTable } from "@/components/admin/users-table";

export const dynamic = "force-dynamic";

export default async function ManageUserPage() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, fullName: true, email: true, phoneNumber: true, role: true, status: true },
  });

  return (
    <div>
      <DashboardHeading title="All users" subtitle="Manage every account on the platform." />
      <UsersTable users={users} />
    </div>
  );
}
