import { z } from "zod";
import { ok, fail, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { menuByRole, type Role } from "@/components/dashboard/menu-config";

const schema = z.object({
  role: z.enum(["ADMIN", "INSTRUCTOR", "AGENT", "STUDENT", "PARENT"]),
  menuKey: z.string().min(1),
  canView: z.boolean(),
});

export const POST = handler(async (req: Request) => {
  await requireRole("ADMIN");
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { role, menuKey, canView } = parsed.data;

  const appRole = await prisma.appRole.upsert({
    where: { name: role },
    create: { name: role },
    update: {},
    include: { permissions: true },
  });

  // Materialize all menu keys for this role on first edit so the
  // "no rows = allow all" fallback doesn't silently re-enable items.
  if (appRole.permissions.length === 0) {
    const allKeys = (menuByRole[role as Role] ?? []).flatMap((g) => g.items.map((i) => i.key));
    await prisma.rolePermission.createMany({
      data: allKeys.map((k) => ({ roleId: appRole.id, menuKey: k, canView: true })),
      skipDuplicates: true,
    });
  }

  await prisma.rolePermission.upsert({
    where: { roleId_menuKey: { roleId: appRole.id, menuKey } },
    create: { roleId: appRole.id, menuKey, canView },
    update: { canView },
  });

  return ok({ saved: true });
});
