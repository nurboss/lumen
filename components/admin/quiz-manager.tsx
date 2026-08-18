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
import { postJson } from "@/lib/client-api";

interface Quiz {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  code: string | null;
  durationMinutes: number | null;
  marks: number;
  passingMarks: number | null;
  numberOfQuestions: number | null;
  extraRetakes: number;
  randomize: boolean;
  showResultAfterSubmit: boolean;
  autoEvaluate: boolean;
  questions: { questionId: string }[];
  _count: { questions: number; results: number };
}

interface QBank {
  id: string;
  text: string;
  type: string;
  marks: number;
}

export function QuizManager({ quizzes, questions }: { quizzes: Quiz[]; questions: QBank[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(id: string) {
    if (!confirm("Delete this quiz?")) return;
    setBusy(true);
    const res = await postJson("/api/admin/quiz", { action: "delete", id });
    setBusy(false);
    if (!("error" in res)) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> New quiz
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quizzes.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium">
                  {q.title}
                  {q.subtitle && <p className="text-xs text-muted-foreground">{q.subtitle}</p>}
                </TableCell>
                <TableCell>{q._count.questions}</TableCell>
                <TableCell>{q.marks}</TableCell>
                <TableCell>{q.durationMinutes ? `${q.durationMinutes} min` : "—"}</TableCell>
                <TableCell>{q._count.results}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(q); setOpen(true); }} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={busy} onClick={() => remove(q.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {quizzes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No quizzes yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {open && (
        <QuizDialog
          key={editing?.id ?? "new"}
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          questions={questions}
          onSaved={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}

function QuizDialog({
  open,
  onOpenChange,
  editing,
  questions,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Quiz | null;
  questions: QBank[];
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    title: editing?.title ?? "",
    subtitle: editing?.subtitle ?? "",
    description: editing?.description ?? "",
    code: editing?.code ?? "",
    durationMinutes: editing?.durationMinutes?.toString() ?? "",
    marks: editing?.marks?.toString() ?? "0",
    passingMarks: editing?.passingMarks?.toString() ?? "",
    numberOfQuestions: editing?.numberOfQuestions?.toString() ?? "",
    extraRetakes: editing?.extraRetakes?.toString() ?? "0",
  });
  const [randomize, setRandomize] = useState(editing?.randomize ?? false);
  const [showResult, setShowResult] = useState(editing?.showResultAfterSubmit ?? true);
  const [autoEval, setAutoEval] = useState(editing?.autoEvaluate ?? true);
  const [selected, setSelected] = useState<string[]>(editing?.questions.map((q) => q.questionId) ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof f>(key: K, value: string) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  function toggleQuestion(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    setError(null);
    if (!f.title.trim()) return setError("Enter a title.");
    setBusy(true);
    const res = await postJson("/api/admin/quiz", {
      action: editing ? "update" : "create",
      ...(editing ? { id: editing.id } : {}),
      title: f.title.trim(),
      subtitle: f.subtitle.trim(),
      description: f.description.trim(),
      code: f.code.trim(),
      durationMinutes: f.durationMinutes ? Number(f.durationMinutes) : undefined,
      marks: Number(f.marks) || 0,
      passingMarks: f.passingMarks ? Number(f.passingMarks) : undefined,
      numberOfQuestions: f.numberOfQuestions ? Number(f.numberOfQuestions) : undefined,
      extraRetakes: Number(f.extraRetakes) || 0,
      randomize,
      showResultAfterSubmit: showResult,
      autoEvaluate: autoEval,
      questionIds: selected,
    });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit quiz" : "New quiz"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={f.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={f.code} onChange={(e) => set("code", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input type="number" value={f.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Total marks</Label>
              <Input type="number" value={f.marks} onChange={(e) => set("marks", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Passing marks</Label>
              <Input type="number" value={f.passingMarks} onChange={(e) => set("passingMarks", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label># Questions</Label>
              <Input type="number" value={f.numberOfQuestions} onChange={(e) => set("numberOfQuestions", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Extra retakes</Label>
              <Input type="number" value={f.extraRetakes} onChange={(e) => set("extraRetakes", e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Toggle label="Randomize" checked={randomize} onChange={setRandomize} />
            <Toggle label="Show result after submit" checked={showResult} onChange={setShowResult} />
            <Toggle label="Auto-evaluate" checked={autoEval} onChange={setAutoEval} />
          </div>

          <div className="space-y-2">
            <Label>Questions ({selected.length} selected)</Label>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {questions.map((q) => (
                <label key={q.id} className="flex items-start gap-2 rounded p-1 text-sm hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={selected.includes(q.id)}
                    onChange={() => toggleQuestion(q.id)}
                    className="mt-1 h-4 w-4 shrink-0"
                  />
                  <span className="line-clamp-1 flex-1">{q.text}</span>
                  <Badge variant="outline" className="shrink-0">{q.marks}m</Badge>
                </label>
              ))}
              {questions.length === 0 && (
                <p className="p-1 text-sm text-muted-foreground">No questions in the bank yet.</p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={save} disabled={busy}>{editing ? "Save changes" : "Create quiz"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
