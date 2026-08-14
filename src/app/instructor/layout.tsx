import { requireDashboard, roleLabels } from "@/lib/dashboard";
import { getAllowedMenuKeys } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireDashboard(["INSTRUCTOR"]);
  const allowedKeys = await getAllowedMenuKeys("INSTRUCTOR");
  return (
    <DashboardShell
      role="INSTRUCTOR"
      allowedKeys={allowedKeys}
      userName={user.fullName}
      roleLabel={roleLabels.INSTRUCTOR}
      profileHref="/instructor/userProfile"
    >
      {children}
    </DashboardShell>
  );
}
