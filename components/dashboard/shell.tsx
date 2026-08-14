import { DashboardSidebar } from "./sidebar";
import { DashboardTopbar } from "./topbar";
import type { Role } from "./menu-config";

interface DashboardShellProps {
  role: Role;
  allowedKeys: string[];
  userName: string;
  roleLabel: string;
  profileHref: string;
  children: React.ReactNode;
}

export function DashboardShell({
  role,
  allowedKeys,
  userName,
  roleLabel,
  profileHref,
  children,
}: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar role={role} allowedKeys={allowedKeys} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar userName={userName} roleLabel={roleLabel} profileHref={profileHref} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
