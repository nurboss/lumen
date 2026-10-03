"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { menuByRole, type Role, type MenuGroup } from "./menu-config";

interface DashboardSidebarProps {
  role: Role;
  /** Optional set of allowed menu keys (RBAC). When omitted, all items show. */
  allowedKeys?: string[];
}

export function DashboardSidebar({ role, allowedKeys }: DashboardSidebarProps) {
  const pathname = usePathname();
  const groups: MenuGroup[] = menuByRole[role] ?? [];

  const filterItems = (group: MenuGroup) =>
    group.items.filter((item) => !allowedKeys || allowedKeys.includes(item.key));

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold text-sidebar-foreground">
          <GraduationCap className="h-6 w-6 text-sidebar-primary" />
          Lumen
        </Link>
      </div>
      <nav className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group, gi) => {
          const items = filterItems(group);
          if (items.length === 0) return null;
          return (
            <div key={gi} className="mb-4">
              {group.heading && (
                <p className="eyebrow px-3 pb-2 text-[0.65rem]">{group.heading}</p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/80 hover:bg-secondary hover:text-sidebar-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
