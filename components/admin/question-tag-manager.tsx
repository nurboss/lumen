"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { postJson } from "@/lib/client-api";

interface Tag {
  id: string;
  name: string;
  _count?: { questions: number };
}

export function QuestionTagManager({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await postJson("/api/admin/question-tag", body);
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return false;
    }
    router.refresh();
    return true;
  }

  async function add() {
    if (!name.trim()) return;
    if (await submit({ action: "create", name: name.trim() })) setName("");
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    if (await submit({ action: "update", id, name: editName.trim() })) setEditingId(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this tag?")) return;
    await submit({ action: "delete", id });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="New tag name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button onClick={add} disabled={busy}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">
                  {editingId === t.id ? (
                    <Input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(t.id)}
                    />
                  ) : (
                    t.name
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{t._count?.questions ?? 0}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {editingId === t.id ? (
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" disabled={busy} onClick={() => saveEdit(t.id)} aria-label="Save">
                        <Check className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditingId(null)} aria-label="Cancel">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(t.id);
                          setEditName(t.name);
                        }}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={busy} onClick={() => remove(t.id)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {tags.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">No tags yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
