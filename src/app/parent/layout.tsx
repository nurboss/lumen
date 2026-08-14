import { requireDashboard, roleLabels } from "@/lib/dashboard";
import { getAllowedMenuKeys } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireDashboard(["PARENT"]);
  const allowedKeys = await getAllowedMenuKeys("PARENT");
  return (
    <DashboardShell
      role="PARENT"
      allowedKeys={allowedKeys}
      userName={user.fullName}
      roleLabel={roleLabels.PARENT}
      profileHref="/parent/userProfile"
    >
      {children}
    </DashboardShell>
  );
}
