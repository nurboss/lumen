"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/client-api";

export function UserStatusActions({
  userId,
  status,
}: {
  userId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(next: "ACTIVE" | "SUSPENDED") {
    setBusy(true);
    await postJson("/api/admin/user/status", { userId, status: next });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {status !== "ACTIVE" && (
        <Button size="sm" disabled={busy} onClick={() => set("ACTIVE")}>
          {status === "PENDING" ? "Approve" : "Activate"}
        </Button>
      )}
      {status !== "SUSPENDED" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => set("SUSPENDED")}>
          Suspend
        </Button>
      )}
    </div>
  );
}
