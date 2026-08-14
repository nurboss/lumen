import { requireDashboard, roleLabels } from "@/lib/dashboard";
import { getAllowedMenuKeys } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireDashboard(["AGENT"]);
  const allowedKeys = await getAllowedMenuKeys("AGENT");
  return (
    <DashboardShell
      role="AGENT"
      allowedKeys={allowedKeys}
      userName={user.fullName}
      roleLabel={roleLabels.AGENT}
      profileHref="/agent/userProfile"
    >
      {children}
    </DashboardShell>
  );
}
