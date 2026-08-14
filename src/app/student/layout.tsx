import { requireDashboard, roleLabels } from "@/lib/dashboard";
import { getAllowedMenuKeys } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireDashboard(["STUDENT"]);
  const allowedKeys = await getAllowedMenuKeys("STUDENT");
  return (
    <DashboardShell
      role="STUDENT"
      allowedKeys={allowedKeys}
      userName={user.fullName}
      roleLabel={roleLabels.STUDENT}
      profileHref="/student/userProfile"
    >
      {children}
    </DashboardShell>
  );
}
