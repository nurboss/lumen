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

interface Section {
  id: string;
  title: string;
  order: number;
  courseId: string | null;
  batchId: string | null;
  quizId: string | null;
  assignmentId: string | null;
  course: { title: string } | null;
  batch: { name: string | null; course: { title: string } } | null;
  quiz: { title: string } | null;
  assignment: { title: string } | null;
  _count: { units: number };
}

interface Opt { id: string; title?: string; label?: string; }

const NONE = "__none__";

export function SectionManager({
  sections,
  courses,
  batches,
  quizzes,
  assignments,
}: {
  sections: Section[];
  courses: Opt[];
  batches: Opt[];
  quizzes: Opt[];
  assignments: Opt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(id: string) {
    if (!confirm("Delete this section? Its units will be removed.")) return;
    setBusy(true);
    const res = await postJson("/api/admin/section", { action: "delete", id });
    setBusy(false);
    if (!("error" in res)) router.refresh();
  }

  const canCreate = courses.length > 0 || batches.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }} disabled={!canCreate}>
          <Plus className="mr-1 h-4 w-4" /> New section
        </Button>
      </div>
      {!canCreate && <p className="text-sm text-muted-foreground">Create a course or batch first.</p>}

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Belongs to</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Attached</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map((s) => (
              <TableRow key={s.id}>
                <TableCell><Badge variant="outline">#{s.order}</Badge></TableCell>
                <TableCell className="font-medium">{s.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {s.course ? s.course.title : s.batch ? `${s.batch.course.title} — ${s.batch.name ?? "Batch"}` : "Unassigned"}
                </TableCell>
                <TableCell>{s._count.units}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {s.quiz && <Badge variant="outline">Quiz: {s.quiz.title}</Badge>}
                    {s.assignment && <Badge variant="outline">Assignment: {s.assignment.title}</Badge>}
                    {!s.quiz && !s.assignment && <span className="text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={busy} onClick={() => remove(s.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sections.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No sections yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {open && (
        <SectionDialog
          key={editing?.id ?? "new"}
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          courses={courses}
          batches={batches}
          quizzes={quizzes}
          assignments={assignments}
          onSaved={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function label(o: Opt) {
  return o.label ?? o.title ?? o.id;
}

function SectionDialog({
  open,
  onOpenChange,
  editing,
  courses,
  batches,
  quizzes,
  assignments,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Section | null;
  courses: Opt[];
  batches: Opt[];
  quizzes: Opt[];
  assignments: Opt[];
  onSaved: () => void;
}) {
  const initialParentType: "course" | "batch" = editing?.batchId ? "batch" : "course";
  const [title, setTitle] = useState(editing?.title ?? "");
  const [order, setOrder] = useState(editing?.order?.toString() ?? "0");
  const [parentType, setParentType] = useState<"course" | "batch">(initialParentType);
  const [parentId, setParentId] = useState(
    editing?.courseId ?? editing?.batchId ?? courses[0]?.id ?? batches[0]?.id ?? ""
  );
  const [quizId, setQuizId] = useState(editing?.quizId ?? NONE);
  const [assignmentId, setAssignmentId] = useState(editing?.assignmentId ?? NONE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentOptions = parentType === "course" ? courses : batches;

  function changeParentType(v: "course" | "batch") {
    setParentType(v);
    setParentId((v === "course" ? courses : batches)[0]?.id ?? "");
  }

  async function save() {
    setError(null);
    if (!title.trim()) return setError("Enter a title.");
    if (!parentId) return setError("Choose a course or batch.");
    setBusy(true);
    const res = await postJson("/api/admin/section", {
      action: editing ? "update" : "create",
      ...(editing ? { id: editing.id } : {}),
      title: title.trim(),
      order: Number(order) || 0,
      parentType,
      parentId,
      quizId: quizId === NONE ? "" : quizId,
      assignmentId: assignmentId === NONE ? "" : assignmentId,
    });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit section" : "New section"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Belongs to</Label>
              <Select value={parentType} onValueChange={(v) => changeParentType(v as "course" | "batch")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="course" disabled={courses.length === 0}>Course</SelectItem>
                  <SelectItem value="batch" disabled={batches.length === 0}>Batch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{parentType === "course" ? "Course" : "Batch"}</Label>
              <Select value={parentId} onValueChange={(v) => setParentId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {parentOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{label(o)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Attach quiz</Label>
              <Select value={quizId} onValueChange={(v) => setQuizId(v ?? NONE)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {quizzes.map((q) => (
                    <SelectItem key={q.id} value={q.id}>{label(q)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Attach assignment</Label>
              <Select value={assignmentId} onValueChange={(v) => setAssignmentId(v ?? NONE)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {assignments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{label(a)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={save} disabled={busy}>{editing ? "Save changes" : "Create section"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
