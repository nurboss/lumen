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
    <div className="min-h-screen bg-background">
      {/* Fixed rail — pinned to the viewport, never scrolls with the page. */}
      <DashboardSidebar role={role} allowedKeys={allowedKeys} />
      {/* Content column is offset by the sidebar width on large screens. */}
      <div className="flex min-h-screen min-w-0 flex-col lg:pl-64">
        <DashboardTopbar userName={userName} roleLabel={roleLabel} profileHref={profileHref} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
