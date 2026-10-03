import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth";
import type { Role } from "@/src/generated/prisma/enums";
import { rolePrefix } from "@/components/dashboard/menu-config";

/**
 * Server-side dashboard guard. Redirects unauthenticated users to /login and
 * users with the wrong role to their own dashboard. Returns the session user.
 */
export async function requireDashboard(allowed: Role[]): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!allowed.includes(user.role)) {
    redirect(rolePrefix[user.role] ?? "/");
  }
  return user;
}

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  INSTRUCTOR: "Instructor",
  AGENT: "Agent",
  STUDENT: "Student",
};
