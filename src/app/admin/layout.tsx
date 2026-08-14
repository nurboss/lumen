import { requireDashboard, roleLabels } from "@/lib/dashboard";
import { getAllowedMenuKeys } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireDashboard(["ADMIN"]);
  const allowedKeys = await getAllowedMenuKeys("ADMIN");
  return (
    <DashboardShell
      role="ADMIN"
      allowedKeys={allowedKeys}
      userName={user.fullName}
      roleLabel={roleLabels.ADMIN}
      profileHref="/admin/userProfile"
    >
      {children}
    </DashboardShell>
  );
}
