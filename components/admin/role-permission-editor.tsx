"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { postJson } from "@/lib/client-api";
import { cn } from "@/lib/utils";

interface Item {
  key: string;
  label: string;
  canView: boolean;
  locked: boolean;
}
interface RoleData {
  role: string;
  items: Item[];
}

export function RolePermissionEditor({ roles }: { roles: RoleData[] }) {
  const [state, setState] = useState(roles);
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(role: string, key: string, next: boolean) {
    setState((prev) =>
      prev.map((r) =>
        r.role === role
          ? { ...r, items: r.items.map((it) => (it.key === key ? { ...it, canView: next } : it)) }
          : r
      )
    );
    setSaving(`${role}:${key}`);
    await postJson("/api/admin/role-permission", { role, menuKey: key, canView: next });
    setSaving(null);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {state.map((r) => (
        <Card key={r.role}>
          <CardHeader>
            <CardTitle className="font-heading text-lg">{r.role}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {r.items.map((it) => (
              <label
                key={it.key}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm",
                  it.locked ? "opacity-60" : "hover:bg-secondary"
                )}
              >
                <span className="text-foreground">{it.label}</span>
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={it.canView}
                  disabled={it.locked || saving === `${r.role}:${it.key}`}
                  onChange={(e) => toggle(r.role, it.key, e.target.checked)}
                />
              </label>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
