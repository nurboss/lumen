import prisma from "@/lib/prisma";
import { menuByRole, type Role } from "@/components/dashboard/menu-config";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { RolePermissionEditor } from "@/components/admin/role-permission-editor";

export const dynamic = "force-dynamic";

const ROLES: Role[] = ["INSTRUCTOR", "AGENT", "STUDENT", "PARENT"];

export default async function ManageRolePermissionPage() {
  const appRoles = await prisma.appRole.findMany({ include: { permissions: true } });
  const byName = new Map(appRoles.map((r) => [r.name, r]));

  const data = ROLES.map((role) => {
    const existing = byName.get(role);
    const permMap = new Map(existing?.permissions.map((p) => [p.menuKey, p.canView]));
    const items = (menuByRole[role] ?? []).flatMap((g) => g.items);
    return {
      role,
      items: items.map((it) => ({
        key: it.key,
        label: it.label,
        canView: permMap.has(it.key) ? Boolean(permMap.get(it.key)) : true,
        locked: it.key === "dashboard",
      })),
    };
  });

  return (
    <div>
      <DashboardHeading
        title="Menu permissions"
        subtitle="Control which sidebar items each role can see. Changes apply on their next page load."
      />
      <RolePermissionEditor roles={data} />
    </div>
  );
}
