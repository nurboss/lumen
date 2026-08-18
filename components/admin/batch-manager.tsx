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
import { formatDate } from "@/lib/format";

const DAYS = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"] as const;
type Day = (typeof DAYS)[number];

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
  course: { title: string };
  _count: { enrollments: number; sections: number };
}

interface Course {
  id: string;
  title: string;
}

function toDateInput(iso: string | null) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

export function BatchManager({ batches, courses }: { batches: Batch[]; courses: Course[] }) {
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
                <TableCell colSpan={7} className="text-center text-muted-foreground">No batches yet.</TableCell>
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
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Batch | null;
  courses: Course[];
  onSaved: () => void;
}) {
  const [courseId, setCourseId] = useState(editing?.courseId ?? courses[0]?.id ?? "");
  const [name, setName] = useState(editing?.name ?? "");
  const [startDate, setStartDate] = useState(toDateInput(editing?.startDate ?? null));
  const [endDate, setEndDate] = useState(toDateInput(editing?.endDate ?? null));
  const [scheduleDays, setScheduleDays] = useState<Day[]>((editing?.scheduleDays as Day[]) ?? []);
  const [scheduleTime, setScheduleTime] = useState(editing?.scheduleTime ?? "");
  const [seats, setSeats] = useState(editing?.seats?.toString() ?? "");
  const [dummy, setDummy] = useState(editing?.dummyParticipants?.toString() ?? "0");
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

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={save} disabled={busy}>{editing ? "Save changes" : "Create batch"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
