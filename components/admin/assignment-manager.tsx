"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ClipboardCheck, ExternalLink, CheckCircle2, Inbox } from "lucide-react";
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
import { getJson, postJson } from "@/lib/client-api";

type SubType = "TEXT_AREA" | "FILE" | "BOTH";
type Unit = "SECOND" | "MINUTE" | "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";

interface Assignment {
  id: string;
  title: string;
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
  const [reviewing, setReviewing] = useState<Assignment | null>(null);
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
                <TableCell className="font-medium">{a.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{SUB_LABELS[a.submissionType]}</Badge>
                </TableCell>
                <TableCell>{a.maximumMarks}</TableCell>
                <TableCell>{a.timeLimit ? `${a.timeLimit} ${a.durationUnit?.toLowerCase()}` : "—"}</TableCell>
                <TableCell>
                  {a._count.submissions > 0 ? (
                    <button
                      type="button"
                      onClick={() => setReviewing(a)}
                      className="font-medium text-primary hover:underline"
                    >
                      {a._count.submissions}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={a._count.submissions === 0}
                      onClick={() => setReviewing(a)}
                      aria-label="Review submissions"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                    </Button>
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

      {reviewing && (
        <SubmissionsDialog
          assignment={reviewing}
          onClose={() => { setReviewing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

type SubStatus = "SUBMITTED" | "EVALUATED" | "RESUBMIT";

interface Submission {
  id: string;
  contentText: string | null;
  fileUrl: string | null;
  marks: number | null;
  feedback: string | null;
  status: SubStatus;
  createdAt: string;
  updatedAt: string;
  user: { id: string; fullName: string; email: string | null };
}

const STATUS_LABELS: Record<SubStatus, string> = {
  SUBMITTED: "Awaiting review",
  EVALUATED: "Graded",
  RESUBMIT: "Resubmit requested",
};

function SubmissionsDialog({
  assignment,
  onClose,
}: {
  assignment: Assignment;
  onClose: () => void;
}) {
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getJson<{ submissions: Submission[] }>(
      `/api/admin/assignment/submissions?assignmentId=${assignment.id}`
    ).then((res) => {
      if (!alive) return;
      if ("error" in res) setError(res.error);
      else setSubs(res.data.submissions);
    });
    return () => { alive = false; };
  }, [assignment.id]);

  const pending = subs?.filter((s) => s.status === "SUBMITTED").length ?? 0;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{assignment.title} — submissions</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Max marks: <strong className="text-foreground">{assignment.maximumMarks}</strong></span>
          {subs && (
            <>
              <span>·</span>
              <span>{subs.length} total</span>
              {pending > 0 && (
                <>
                  <span>·</span>
                  <span className="text-primary">{pending} awaiting review</span>
                </>
              )}
            </>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {!subs && !error && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}

        {subs && subs.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Inbox className="h-8 w-8" />
            <p className="text-sm">No submissions yet.</p>
          </div>
        )}

        <div className="space-y-3">
          {subs?.map((s) => (
            <SubmissionCard key={s.id} sub={s} maxMarks={assignment.maximumMarks} />
          ))}
        </div>

        <DialogFooter showCloseButton>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionCard({ sub, maxMarks }: { sub: Submission; maxMarks: number }) {
  const [marks, setMarks] = useState(sub.marks?.toString() ?? "");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  const [status, setStatus] = useState<SubStatus>(sub.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setError(null);
    const marksNum = marks === "" ? undefined : Number(marks);
    if (marksNum !== undefined && (Number.isNaN(marksNum) || marksNum < 0 || marksNum > maxMarks)) {
      return setError(`Marks must be between 0 and ${maxMarks}.`);
    }
    setBusy(true);
    const res = await postJson("/api/assignment_result/update", {
      id: sub.id,
      marks: marksNum,
      feedback: feedback.trim() || undefined,
      status: status === "SUBMITTED" ? "EVALUATED" : status,
    });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    setStatus(status === "SUBMITTED" ? "EVALUATED" : status);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{sub.user.fullName}</p>
          {sub.user.email && <p className="truncate text-xs text-muted-foreground">{sub.user.email}</p>}
          <p className="mt-0.5 text-xs text-muted-foreground">
            Submitted {new Date(sub.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={status === "EVALUATED" ? "default" : status === "RESUBMIT" ? "destructive" : "secondary"}>
          {STATUS_LABELS[status]}
        </Badge>
      </div>

      {sub.contentText && (
        <div className="mt-3 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm text-foreground">
          {sub.contentText}
        </div>
      )}
      {sub.fileUrl && (
        <a
          href={sub.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open submitted file
        </a>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[110px_1fr]">
        <div className="space-y-1.5">
          <Label className="text-xs">Marks (of {maxMarks})</Label>
          <Input
            type="number"
            min={0}
            max={maxMarks}
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            placeholder="—"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as SubStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EVALUATED">Graded</SelectItem>
              <SelectItem value="RESUBMIT">Request resubmission</SelectItem>
              <SelectItem value="SUBMITTED">Awaiting review</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <Label className="text-xs">Feedback</Label>
        <Textarea
          rows={2}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Optional feedback for the student…"
        />
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save grade"}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" /> Saved & student notified
          </span>
        )}
      </div>
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
