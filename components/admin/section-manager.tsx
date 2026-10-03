"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, ChevronUp, ChevronDown, Check } from "lucide-react";
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

type Kind = "UNIT" | "QUIZ" | "ASSIGNMENT";

interface SecItem {
  id: string;
  order: number;
  kind: Kind;
  unit: { id: string; title: string } | null;
  quiz: { id: string; title: string } | null;
  assignment: { id: string; title: string } | null;
}

interface Section {
  id: string;
  title: string;
  order: number;
  courseId: string | null;
  batchId: string | null;
  course: { title: string } | null;
  batch: { name: string | null; course: { title: string } } | null;
  items: SecItem[];
}

interface Opt { id: string; title?: string; label?: string; }
interface UnitOpt { id: string; title: string; sectionId: string | null; }

const NONE = "__none__";
const KIND_LABEL: Record<Kind, string> = { UNIT: "Unit", QUIZ: "Quiz", ASSIGNMENT: "Assignment" };

export function SectionManager({
  sections,
  courses,
  batches,
  units,
  quizzes,
  assignments,
}: {
  sections: Section[];
  courses: Opt[];
  batches: Opt[];
  units: UnitOpt[];
  quizzes: Opt[];
  assignments: Opt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(id: string) {
    if (!confirm("Delete this section? Its units will be detached and quiz/assignment links removed.")) return;
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
              <TableHead>Curriculum</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map((s) => {
              const counts = {
                UNIT: s.items.filter((i) => i.kind === "UNIT").length,
                QUIZ: s.items.filter((i) => i.kind === "QUIZ").length,
                ASSIGNMENT: s.items.filter((i) => i.kind === "ASSIGNMENT").length,
              };
              return (
                <TableRow key={s.id}>
                  <TableCell><Badge variant="outline">#{s.order}</Badge></TableCell>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.course ? s.course.title : s.batch ? `${s.batch.course.title} — ${s.batch.name ?? "Batch"}` : "Unassigned"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {counts.UNIT > 0 && <Badge variant="secondary">{counts.UNIT} units</Badge>}
                      {counts.QUIZ > 0 && <Badge variant="outline">{counts.QUIZ} quiz</Badge>}
                      {counts.ASSIGNMENT > 0 && <Badge variant="outline">{counts.ASSIGNMENT} assignment</Badge>}
                      {s.items.length === 0 && <span className="text-muted-foreground">—</span>}
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
              );
            })}
            {sections.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">No sections yet.</TableCell>
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
          units={units}
          quizzes={quizzes}
          assignments={assignments}
          onSaved={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function optLabel(o: Opt) {
  return o.label ?? o.title ?? o.id;
}

interface EditorItem { kind: Kind; refId: string; }

function SectionDialog({
  open,
  onOpenChange,
  editing,
  courses,
  batches,
  units,
  quizzes,
  assignments,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Section | null;
  courses: Opt[];
  batches: Opt[];
  units: UnitOpt[];
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
  const [items, setItems] = useState<EditorItem[]>(
    editing?.items.map((i) => ({
      kind: i.kind,
      refId: i.unit?.id ?? i.quiz?.id ?? i.assignment?.id ?? "",
    })) ?? []
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentOptions = parentType === "course" ? courses : batches;
  // Units owned by another section can't be picked (each unit belongs to one section).
  const unitOptions: Opt[] = units
    .filter((u) => !u.sectionId || u.sectionId === editing?.id)
    .map((u) => ({ id: u.id, title: u.title }));

  function changeParentType(v: "course" | "batch") {
    setParentType(v);
    setParentId((v === "course" ? courses : batches)[0]?.id ?? "");
  }

  function addItem(kind: Kind) {
    setItems((prev) => [...prev, { kind, refId: "" }]);
  }
  function patchItem(i: number, refId: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, refId } : it)));
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function moveItem(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function optionsFor(kind: Kind): Opt[] {
    return kind === "UNIT" ? unitOptions : kind === "QUIZ" ? quizzes : assignments;
  }

  // A section may hold only one quiz and one assignment; units are unlimited.
  const hasQuiz = items.some((it) => it.kind === "QUIZ");
  const hasAssignment = items.some((it) => it.kind === "ASSIGNMENT");

  async function save() {
    setError(null);
    if (!title.trim()) return setError("Enter a title.");
    if (!parentId) return setError("Choose a course or batch.");
    if (items.some((it) => !it.refId)) return setError("Pick a target for every curriculum item, or remove it.");
    setBusy(true);
    const res = await postJson("/api/admin/section", {
      action: editing ? "update" : "create",
      ...(editing ? { id: editing.id } : {}),
      title: title.trim(),
      order: Number(order) || 0,
      parentType,
      parentId,
      items: items.map((it) => ({ kind: it.kind, refId: it.refId })),
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
                    <SelectItem key={o.id} value={o.id}>{optLabel(o)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ordered curriculum: units, quizzes and assignments in any order. */}
          <div className="space-y-2">
            <Label>Curriculum items</Label>
            <div className="space-y-2">
              {items.length === 0 && (
                <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                  No items yet. Add a unit, quiz or assignment below.
                </p>
              )}
              {items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md border border-border/70 p-2">
                  <div className="flex flex-col">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(i, -1)} aria-label="Move up"><ChevronUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(i, 1)} aria-label="Move down"><ChevronDown className="h-4 w-4" /></Button>
                  </div>
                  <Badge variant="secondary" className="mt-1 shrink-0">{KIND_LABEL[item.kind]}</Badge>
                  <div className="flex-1">
                    <SearchSelect
                      placeholder={`Search a ${KIND_LABEL[item.kind].toLowerCase()}…`}
                      options={optionsFor(item.kind)}
                      value={item.refId}
                      onChange={(v) => patchItem(i, v)}
                    />
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Remove item" onClick={() => removeItem(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => addItem("UNIT")}>
                <Plus className="mr-1 h-4 w-4" /> Add unit
              </Button>
              <Button variant="outline" size="sm" onClick={() => addItem("QUIZ")} disabled={hasQuiz}>
                <Plus className="mr-1 h-4 w-4" /> Add quiz
              </Button>
              <Button variant="outline" size="sm" onClick={() => addItem("ASSIGNMENT")} disabled={hasAssignment}>
                <Plus className="mr-1 h-4 w-4" /> Add assignment
              </Button>
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

/* Searchable dropdown for picking an existing unit / quiz / assignment. */
function SearchSelect({
  placeholder,
  value,
  options,
  onChange,
}: {
  placeholder: string;
  value: string;
  options: Opt[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.id === value);
  const filtered = query
    ? options.filter((o) => optLabel(o).toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div className="relative">
      <Input
        value={open ? query : selected ? optLabel(selected) : ""}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
          {filtered.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No results.</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(o.id); setQuery(""); setOpen(false); }}
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className="truncate">{optLabel(o)}</span>
                {o.id === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
