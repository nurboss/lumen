"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { postJson } from "@/lib/client-api";

export function WithdrawalForm({ maxPaisa }: { maxPaisa: number }) {
  const router = useRouter();
  const [taka, setTaka] = useState("");
  const [method, setMethod] = useState("bKash");
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    const amount = Math.round(Number(taka) * 100);
    if (!amount || amount <= 0) return setError("Enter a valid amount.");
    if (amount > maxPaisa) return setError("Amount exceeds available balance.");
    setBusy(true);
    const res = await postJson("/api/pay/withdrawal/request", {
      amount,
      payoutMethod: method,
      payoutNumber: number,
    });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    setTaka("");
    setNumber("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (৳)</Label>
          <Input id="amount" inputMode="decimal" value={taka} onChange={(e) => setTaka(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Method</Label>
          <Select value={method} onValueChange={(v) => setMethod((v as string) ?? "bKash")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bKash">bKash</SelectItem>
              <SelectItem value="Nagad">Nagad</SelectItem>
              <SelectItem value="Rocket">Rocket</SelectItem>
              <SelectItem value="Bank">Bank</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="number">Account number</Label>
          <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={submit} disabled={busy}>
        {busy ? "Requesting…" : "Request withdrawal"}
      </Button>
    </div>
  );
}
