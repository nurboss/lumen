import "server-only";
import prisma from "@/lib/prisma";
import type { Role } from "@/src/generated/prisma/enums";
import { menuByRole } from "@/components/dashboard/menu-config";

/**
 * Returns the set of menu keys a role is allowed to see.
 *
 * If a matching custom AppRole (by enum name) defines RolePermission rows, those
 * gate visibility (canView). Otherwise every menu item for the role is allowed.
 */
export async function getAllowedMenuKeys(role: Role): Promise<string[]> {
  const allKeys = (menuByRole[role] ?? []).flatMap((g) =>
    g.items.map((i) => i.key)
  );

  const appRole = await prisma.appRole.findUnique({
    where: { name: role },
    include: { permissions: true },
  });

  if (!appRole || appRole.permissions.length === 0) {
    return allKeys; // no custom RBAC configured → allow all
  }

  const viewable = new Set(
    appRole.permissions.filter((p) => p.canView).map((p) => p.menuKey)
  );
  // Dashboard root is always visible.
  return allKeys.filter((k) => k === "dashboard" || viewable.has(k));
}
