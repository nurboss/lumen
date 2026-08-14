"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/client-api";

export function WithdrawalActions({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(status: "APPROVED" | "REJECTED") {
    setBusy(true);
    await postJson("/api/pay/update_withdrawal_status", { transactionId, status });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" disabled={busy} onClick={() => act("APPROVED")}>Approve</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => act("REJECTED")}>Reject</Button>
    </div>
  );
}
