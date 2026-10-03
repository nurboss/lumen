"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { formatDate } from "@/lib/format";

const DAYS = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"] as const;
type Day = (typeof DAYS)[number];

// Every curriculum item references an existing record (unit / quiz / assignment)
// picked from a searchable dropdown, identified by its id. Mirrors the course wizard.
type CurriculumKind = "unit" | "quiz" | "assignment";
interface CurriculumItem {
  kind: CurriculumKind;
  refId: string;
}
interface CurriculumSection {
  title: string;
  items: CurriculumItem[];
}

// Read-only shape of an existing batch's saved curriculum (edit mode).
interface SavedSectionItem {
  id: string;
  kind: "UNIT" | "QUIZ" | "ASSIGNMENT";
  unit: { title: string; type: string } | null;
  quiz: { title: string } | null;
  assignment: { title: string } | null;
}
interface SavedSection {
  id: string;
  title: string;
  items: SavedSectionItem[];
}

// A unit fetched from its table — carries the fields we copy into the new section.
interface UnitOpt {
  id: string;
  title: string;
  type: string;
  description: string | null;
  isFree: boolean;
  publicVideoUrl: string | null;
  storageVideoUrl: string | null;
}

interface Opt {
  id: string;
  name?: string;
  title?: string;
  fullName?: string;
}

interface Batch {
  id: string;
  courseId: string;
  name: string | null;
  startDate: string | null;
  endDate: string | null;
  scheduleDays: string[];
  scheduleTime: string | null;
  seats: number | null;
  dummyParticipants: number;
  course: { title: string; status: string; deletedAt: string | null };
  sections: SavedSection[];
  _count: { enrollments: number; sections: number };
}

interface Course {
  id: string;
  title: string;
}

interface ManagerProps {
  batches: Batch[];
  courses: Course[];
  units: UnitOpt[];
  quizzes: Opt[];
  assignments: Opt[];
}

function toDateInput(iso: string | null) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

function optLabel(o: Opt) {
  return o.name ?? o.title ?? o.fullName ?? o.id;
}

export function BatchManager({ batches, courses, units, quizzes, assignments }: ManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(id: string) {
    if (!confirm("Delete this batch?")) return;
    setBusy(true);
    const res = await postJson("/api/admin/batch", { action: "delete", id });
    setBusy(false);
    if (!("error" in res)) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }} disabled={courses.length === 0}>
          <Plus className="mr-1 h-4 w-4" /> New batch
        </Button>
      </div>
      {courses.length === 0 && (
        <p className="text-sm text-muted-foreground">Create a course first before adding batches.</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Enrollment</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name || "Untitled batch"}</TableCell>
                <TableCell className="text-muted-foreground">{b.course.title}</TableCell>
                <TableCell>
                  {b.course.status !== "PUBLISHED" || b.course.deletedAt ? (
                    <span className="text-xs text-muted-foreground">Publish course to list</span>
                  ) : b.endDate && new Date(b.endDate) < new Date() ? (
                    <Badge variant="secondary">Ended</Badge>
                  ) : b.seats !== null && b._count.enrollments >= b.seats ? (
                    <Badge variant="secondary">Full</Badge>
                  ) : (
                    <Link href={`/courseDetails/${b.courseId}?batch=${b.id}`} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">View enrollment page</Link>
                  )}
                </TableCell>
                <TableCell>{b.startDate ? formatDate(b.startDate) : "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {b.scheduleDays.length > 0 && <Badge variant="secondary">{b.scheduleDays.join(", ")}</Badge>}
                    {b.scheduleTime && <Badge variant="outline">{b.scheduleTime}</Badge>}
                    {b.scheduleDays.length === 0 && !b.scheduleTime && <span className="text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell>{b._count.enrollments}</TableCell>
                <TableCell>{b.seats ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(b); setOpen(true); }} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={busy} onClick={() => remove(b.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {batches.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">No batches yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {open && (
        <BatchDialog
          key={editing?.id ?? "new"}
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          courses={courses}
          units={units}
          quizzes={quizzes}
          assignments={assignments}
          onSaved={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function BatchDialog({
  open,
  onOpenChange,
  editing,
  courses,
  units,
  quizzes,
  assignments,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Batch | null;
  courses: Course[];
  units: UnitOpt[];
  quizzes: Opt[];
  assignments: Opt[];
  onSaved: () => void;
}) {
  const isNew = !editing;
  const unitsById = new Map(units.map((u) => [u.id, u]));
  const [courseId, setCourseId] = useState(editing?.courseId ?? courses[0]?.id ?? "");
  const [name, setName] = useState(editing?.name ?? "");
  const [startDate, setStartDate] = useState(toDateInput(editing?.startDate ?? null));
  const [endDate, setEndDate] = useState(toDateInput(editing?.endDate ?? null));
  const [scheduleDays, setScheduleDays] = useState<Day[]>((editing?.scheduleDays as Day[]) ?? []);
  const [scheduleTime, setScheduleTime] = useState(editing?.scheduleTime ?? "");
  const [seats, setSeats] = useState(editing?.seats?.toString() ?? "");
  const [dummy, setDummy] = useState(editing?.dummyParticipants?.toString() ?? "0");
  const [curriculum, setCurriculum] = useState<CurriculumSection[]>(
    isNew ? [{ title: "Introduction", items: [] }] : []
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(d: Day) {
    setScheduleDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function save() {
    setError(null);
    if (!courseId) return setError("Choose a course.");
    setBusy(true);
    const res = await postJson("/api/admin/batch", {
      action: editing ? "update" : "create",
      ...(editing ? { id: editing.id } : {}),
      courseId,
      name: name.trim(),
      startDate,
      endDate,
      scheduleDays,
      scheduleTime: scheduleTime.trim(),
      seats: seats ? Number(seats) : undefined,
      dummyParticipants: Number(dummy) || 0,
      // Only sent for new batches. Ordered items of any kind; units copy the
      // picked unit's content, quizzes/assignments reference an existing id.
      curriculum: isNew
        ? curriculum
            .filter((s) => s.title.trim())
            .map((s) => ({
              title: s.title.trim(),
              items: s.items
                .filter((it) => it.refId)
                .map((it) => {
                  if (it.kind === "unit") {
                    const u = unitsById.get(it.refId);
                    if (!u) return null;
                    return {
                      kind: "unit" as const,
                      title: u.title,
                      type: u.type,
                      description: u.description ?? "",
                      isFree: u.isFree,
                      publicVideoUrl: u.publicVideoUrl ?? "",
                      storageVideoUrl: u.storageVideoUrl ?? "",
                    };
                  }
                  return { kind: it.kind, refId: it.refId };
                })
                .filter((it): it is NonNullable<typeof it> => it !== null),
            }))
        : [],
    });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit batch" : "New batch"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Course</Label>
            <Select value={courseId} onValueChange={(v) => setCourseId(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Batch name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Batch 01" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Class days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const on = scheduleDays.includes(d);
                return (
                  <button key={d} type="button" onClick={() => toggleDay(d)}>
                    <Badge variant={on ? "default" : "outline"}>{d}</Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Time</Label>
              <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Seats</Label>
              <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dummy count</Label>
              <Input type="number" value={dummy} onChange={(e) => setDummy(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <Label>Curriculum</Label>
            <BatchCurriculum
              isNew={isNew}
              curriculum={curriculum}
              setCurriculum={setCurriculum}
              units={units}
              quizzes={quizzes}
              assignments={assignments}
              savedSections={editing?.sections ?? []}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={save} disabled={busy}>{editing ? "Save changes" : "Create batch"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Curriculum builder (mirrors the course wizard)                      */
/* ------------------------------------------------------------------ */

function BatchCurriculum({
  isNew,
  curriculum,
  setCurriculum,
  units,
  quizzes,
  assignments,
  savedSections,
}: {
  isNew: boolean;
  curriculum: CurriculumSection[];
  setCurriculum: (v: CurriculumSection[]) => void;
  units: UnitOpt[];
  quizzes: Opt[];
  assignments: Opt[];
  savedSections: SavedSection[];
}) {
  if (!isNew) {
    return (
      <div className="space-y-3">
        {savedSections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No curriculum yet. Sections, units, quizzes and assignments are managed from the
            Section and Unit managers after creation.
          </p>
        ) : (
          savedSections.map((section, i) => (
            <div key={section.id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">#{i + 1}</Badge>
                <span className="font-medium">{section.title}</span>
              </div>
              {section.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">No content.</p>
              ) : (
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary" className="capitalize">{item.kind.toLowerCase()}</Badge>
                      <span className="truncate">
                        {item.unit?.title ?? item.quiz?.title ?? item.assignment?.title ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
        <p className="text-xs text-muted-foreground">
          Curriculum is managed from the Section and Unit managers after creation, so existing
          content and student progress are preserved.
        </p>
      </div>
    );
  }

  function update(i: number, patch: Partial<CurriculumSection>) {
    setCurriculum(curriculum.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function moveSection(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= curriculum.length) return;
    const next = [...curriculum];
    [next[i], next[j]] = [next[j], next[i]];
    setCurriculum(next);
  }
  function setItems(i: number, items: CurriculumItem[]) {
    update(i, { items });
  }
  function addItem(i: number, item: CurriculumItem) {
    setItems(i, [...curriculum[i].items, item]);
  }
  function patchItem(i: number, ii: number, patch: Partial<CurriculumItem>) {
    setItems(i, curriculum[i].items.map((it, idx) => (idx === ii ? { ...it, ...patch } : it)));
  }
  function removeItem(i: number, ii: number) {
    setItems(i, curriculum[i].items.filter((_, idx) => idx !== ii));
  }
  function moveItem(i: number, ii: number, dir: -1 | 1) {
    const items = curriculum[i].items;
    const j = ii + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[ii], next[j]] = [next[j], next[ii]];
    setItems(i, next);
  }

  return (
    <div className="space-y-4">
      {curriculum.map((section, i) => {
        const hasQuiz = section.items.some((it) => it.kind === "quiz");
        const hasAssignment = section.items.some((it) => it.kind === "assignment");
        return (
          <div key={i} className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">#{i + 1}</Badge>
              <Input
                value={section.title}
                placeholder="Section title"
                onChange={(e) => update(i, { title: e.target.value })}
              />
              <Button variant="ghost" size="icon" onClick={() => moveSection(i, -1)} aria-label="Move section up"><ChevronUp className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => moveSection(i, 1)} aria-label="Move section down"><ChevronDown className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setCurriculum(curriculum.filter((_, idx) => idx !== i))} aria-label="Delete section">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            {/* Ordered items: units, quizzes and assignments in any order */}
            <div className="space-y-2">
              {section.items.length === 0 && (
                <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                  No content yet. Add a unit, quiz or assignment below.
                </p>
              )}
              {section.items.map((item, ii) => (
                <div key={ii} className="flex items-start gap-2 rounded-md border border-border/70 p-2">
                  <div className="flex flex-col">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(i, ii, -1)} aria-label="Move item up"><ChevronUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(i, ii, 1)} aria-label="Move item down"><ChevronDown className="h-4 w-4" /></Button>
                  </div>
                  <Badge variant="secondary" className="mt-1 shrink-0 capitalize">{item.kind}</Badge>

                  <div className="flex-1">
                    <SearchSelect
                      placeholder={
                        item.kind === "unit" ? "Search a unit…" : item.kind === "quiz" ? "Search a quiz…" : "Search an assignment…"
                      }
                      options={item.kind === "unit" ? units : item.kind === "quiz" ? quizzes : assignments}
                      value={item.refId}
                      onChange={(v) => patchItem(i, ii, { refId: v })}
                    />
                  </div>

                  <Button variant="ghost" size="icon" aria-label="Remove item" onClick={() => removeItem(i, ii)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => addItem(i, { kind: "unit", refId: "" })}>
                <Plus className="mr-1 h-4 w-4" /> Add unit
              </Button>
              <Button variant="outline" size="sm" disabled={hasQuiz} onClick={() => addItem(i, { kind: "quiz", refId: "" })}>
                <Plus className="mr-1 h-4 w-4" /> Add quiz
              </Button>
              <Button variant="outline" size="sm" disabled={hasAssignment} onClick={() => addItem(i, { kind: "assignment", refId: "" })}>
                <Plus className="mr-1 h-4 w-4" /> Add assignment
              </Button>
            </div>
          </div>
        );
      })}

      <Button variant="outline"
        onClick={() => setCurriculum([...curriculum, { title: "", items: [] }])}>
        <Plus className="mr-1 h-4 w-4" /> Add section
      </Button>
    </div>
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
