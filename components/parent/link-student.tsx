"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/client-api";

export function LinkStudent() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function link() {
    setBusy(true);
    setError(null);
    const res = await postJson("/api/parent/link", { identifier });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    setIdentifier("");
    router.refresh();
  }

  return (
    <div className="max-w-md">
      <div className="flex gap-2">
        <Input
          placeholder="Child's email or phone"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <Button onClick={link} disabled={busy}>Link</Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
