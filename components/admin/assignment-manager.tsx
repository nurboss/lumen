"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { postJson } from "@/lib/client-api";

type SubType = "TEXT_AREA" | "FILE" | "BOTH";
type Unit = "SECOND" | "MINUTE" | "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";

interface Assignment {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  timeLimit: number | null;
  durationUnit: Unit | null;
  submissionType: SubType;
  attachmentType: string | null;
  attachmentSizeMb: number | null;
  autoEvaluation: boolean;
  maximumMarks: number;
  _count: { submissions: number };
}

const SUB_LABELS: Record<SubType, string> = {
  TEXT_AREA: "Text area",
  FILE: "File upload",
  BOTH: "Text + file",
};

const UNITS: Unit[] = ["SECOND", "MINUTE", "HOUR", "DAY", "WEEK", "MONTH", "YEAR"];

export function AssignmentManager({ assignments }: { assignments: Assignment[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(id: string) {
    if (!confirm("Delete this assignment?")) return;
    setBusy(true);
    const res = await postJson("/api/admin/assignment", { action: "delete", id });
    setBusy(false);
    if (!("error" in res)) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> New assignment
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Submission</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Time limit</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  {a.title}
                  {a.subtitle && <p className="text-xs text-muted-foreground">{a.subtitle}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{SUB_LABELS[a.submissionType]}</Badge>
                </TableCell>
                <TableCell>{a.maximumMarks}</TableCell>
                <TableCell>{a.timeLimit ? `${a.timeLimit} ${a.durationUnit?.toLowerCase()}` : "—"}</TableCell>
                <TableCell>{a._count.submissions}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(a); setOpen(true); }} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={busy} onClick={() => remove(a.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {assignments.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No assignments yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {open && (
        <AssignmentDialog
          key={editing?.id ?? "new"}
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          onSaved={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function AssignmentDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Assignment | null;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    title: editing?.title ?? "",
    subtitle: editing?.subtitle ?? "",
    description: editing?.description ?? "",
    timeLimit: editing?.timeLimit?.toString() ?? "",
    attachmentType: editing?.attachmentType ?? "",
    attachmentSizeMb: editing?.attachmentSizeMb?.toString() ?? "",
    maximumMarks: editing?.maximumMarks?.toString() ?? "10",
  });
  const [submissionType, setSubmissionType] = useState<SubType>(editing?.submissionType ?? "TEXT_AREA");
  const [durationUnit, setDurationUnit] = useState<Unit>(editing?.durationUnit ?? "DAY");
  const [autoEval, setAutoEval] = useState(editing?.autoEvaluation ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof f>(key: K, value: string) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setError(null);
    if (!f.title.trim()) return setError("Enter a title.");
    setBusy(true);
    const res = await postJson("/api/admin/assignment", {
      action: editing ? "update" : "create",
      ...(editing ? { id: editing.id } : {}),
      title: f.title.trim(),
      subtitle: f.subtitle.trim(),
      description: f.description.trim(),
      timeLimit: f.timeLimit ? Number(f.timeLimit) : undefined,
      durationUnit,
      submissionType,
      attachmentType: f.attachmentType.trim(),
      attachmentSizeMb: f.attachmentSizeMb ? Number(f.attachmentSizeMb) : undefined,
      autoEvaluation: autoEval,
      maximumMarks: Number(f.maximumMarks) || 10,
    });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    onSaved();
  }

  const showFile = submissionType === "FILE" || submissionType === "BOTH";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit assignment" : "New assignment"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={f.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Input value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Submission type</Label>
              <Select value={submissionType} onValueChange={(v) => setSubmissionType(v as SubType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT_AREA">Text area</SelectItem>
                  <SelectItem value="FILE">File upload</SelectItem>
                  <SelectItem value="BOTH">Text + file</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max marks</Label>
              <Input type="number" min={1} value={f.maximumMarks} onChange={(e) => set("maximumMarks", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Time limit</Label>
              <Input type="number" value={f.timeLimit} onChange={(e) => set("timeLimit", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={durationUnit} onValueChange={(v) => setDurationUnit(v as Unit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u[0] + u.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {showFile && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Allowed file types</Label>
                <Input value={f.attachmentType} onChange={(e) => set("attachmentType", e.target.value)} placeholder="pdf, docx" />
              </div>
              <div className="space-y-2">
                <Label>Max size (MB)</Label>
                <Input type="number" value={f.attachmentSizeMb} onChange={(e) => set("attachmentSizeMb", e.target.value)} />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoEval} onChange={(e) => setAutoEval(e.target.checked)} className="h-4 w-4" />
            Auto-evaluation
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={save} disabled={busy}>{editing ? "Save changes" : "Create assignment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
