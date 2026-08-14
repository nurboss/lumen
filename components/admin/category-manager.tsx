"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/client-api";

interface Category {
  id: string;
  name: string;
  slug: string;
  _count?: { courses: number };
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await postJson("/api/course-category/add", { name: name.trim() });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    setName("");
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    const res = await postJson("/api/course-category/delete", { id });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={add} disabled={busy}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c._count?.courses ?? 0} courses</p>
              </div>
              <Button variant="ghost" size="icon" disabled={busy} onClick={() => remove(c.id)} aria-label="Delete">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
