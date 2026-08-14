"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { postJson } from "@/lib/client-api";
import { formatBdt } from "@/lib/format";

interface Promo {
  id: string;
  code: string;
  discountType: string;
  value: number;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
}

export function PromoManager({ promos }: { promos: Promo[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    const num = type === "PERCENT" ? Number(value) : Math.round(Number(value) * 100);
    if (!code.trim() || !num) return setError("Enter a code and value.");
    setBusy(true);
    const res = await postJson("/api/promo/add", { code: code.trim(), discountType: type, value: num });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    setCode("");
    setValue("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SUMMER25" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType((v as "PERCENT" | "FLAT") ?? "PERCENT")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Percent (%)</SelectItem>
                  <SelectItem value="FLAT">Flat (৳)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">{type === "PERCENT" ? "Percent" : "Amount (৳)"}</Label>
              <Input id="value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={add} disabled={busy}>
            <Plus className="mr-1 h-4 w-4" /> Create promo
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {promos.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <code className="font-mono font-bold text-foreground">{p.code}</code>
                <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Active" : "Off"}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {p.discountType === "PERCENT" ? `${p.value}% off` : `${formatBdt(p.value)} off`}
              </p>
              <p className="text-xs text-muted-foreground">
                Used {p.usedCount}{p.usageLimit ? ` / ${p.usageLimit}` : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
