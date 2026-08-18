"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X } from "lucide-react";
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

type QType = "MCQ_SINGLE" | "MCQ_MULTI" | "TRUE_FALSE" | "SHORT_ANSWER" | "DESCRIPTIVE";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  type: QType;
  marks: number;
  options: Option[] | null;
  correctAnswer: string[] | string | null;
  tags: { id: string; name: string }[];
}

interface Tag {
  id: string;
  name: string;
}

const TYPE_LABELS: Record<QType, string> = {
  MCQ_SINGLE: "MCQ (single answer)",
  MCQ_MULTI: "MCQ (multiple answers)",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short answer",
  DESCRIPTIVE: "Descriptive",
};

const TRUE_FALSE_OPTIONS: Option[] = [
  { id: "true", text: "True" },
  { id: "false", text: "False" },
];

function newId() {
  return Math.random().toString(36).slice(2, 9);
}

export function QuestionManager({ questions, tags }: { questions: Question[]; tags: Tag[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setOpen(true);
  }

  async function remove(id: string) {
    if (!confirm("Delete this question?")) return;
    setBusy(true);
    const res = await postJson("/api/admin/question", { action: "delete", id });
    setBusy(false);
    if (!("error" in res)) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> New question
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="max-w-md font-medium">
                  <span className="line-clamp-2">{q.text}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{TYPE_LABELS[q.type]}</Badge>
                </TableCell>
                <TableCell>{q.marks}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {q.tags.map((t) => (
                      <Badge key={t.id} variant="outline">{t.name}</Badge>
                    ))}
                    {q.tags.length === 0 && <span className="text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(q)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={busy} onClick={() => remove(q.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {questions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">No questions yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {open && (
        <QuestionDialog
          key={editing?.id ?? "new"}
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          tags={tags}
          onSaved={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function QuestionDialog({
  open,
  onOpenChange,
  editing,
  tags,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Question | null;
  tags: Tag[];
  onSaved: () => void;
}) {
  const [text, setText] = useState(editing?.text ?? "");
  const [type, setType] = useState<QType>(editing?.type ?? "MCQ_SINGLE");
  const [marks, setMarks] = useState(String(editing?.marks ?? 1));
  const [options, setOptions] = useState<Option[]>(() => {
    if (editing?.type === "TRUE_FALSE") return TRUE_FALSE_OPTIONS;
    if (editing?.options?.length) return editing.options;
    return [
      { id: newId(), text: "" },
      { id: newId(), text: "" },
    ];
  });
  const [correctIds, setCorrectIds] = useState<string[]>(() =>
    Array.isArray(editing?.correctAnswer) ? (editing!.correctAnswer as string[]) : []
  );
  const [correctText, setCorrectText] = useState(
    typeof editing?.correctAnswer === "string" ? editing.correctAnswer : ""
  );
  const [tagIds, setTagIds] = useState<string[]>(editing?.tags.map((t) => t.id) ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsOptions = type === "MCQ_SINGLE" || type === "MCQ_MULTI" || type === "TRUE_FALSE";

  function changeType(next: QType) {
    setType(next);
    setCorrectIds([]);
    if (next === "TRUE_FALSE") {
      setOptions(TRUE_FALSE_OPTIONS);
    } else if (next === "MCQ_SINGLE" || next === "MCQ_MULTI") {
      setOptions((prev) =>
        prev.length >= 2 && prev !== TRUE_FALSE_OPTIONS
          ? prev
          : [
              { id: newId(), text: "" },
              { id: newId(), text: "" },
            ]
      );
    }
  }

  function toggleCorrect(id: string) {
    if (type === "MCQ_MULTI") {
      setCorrectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    } else {
      setCorrectIds([id]);
    }
  }

  async function save() {
    setError(null);
    if (!text.trim()) return setError("Enter the question text.");

    const body: Record<string, unknown> = {
      action: editing ? "update" : "create",
      text: text.trim(),
      type,
      marks: Number(marks) || 1,
      tagIds,
    };
    if (editing) body.id = editing.id;

    if (needsOptions) {
      const cleaned = options.filter((o) => o.text.trim());
      if (cleaned.length < 2) return setError("Provide at least two options.");
      if (correctIds.length === 0) return setError("Mark the correct answer.");
      body.options = cleaned;
      body.correctAnswer = correctIds;
    } else if (type === "SHORT_ANSWER") {
      body.correctAnswer = correctText.trim();
    }

    setBusy(true);
    const res = await postJson("/api/admin/question", body);
    setBusy(false);
    if ("error" in res) return setError(res.error);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit question" : "New question"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Question text</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Type the question…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => changeType(v as QType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as QType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marks</Label>
              <Input type="number" min={1} value={marks} onChange={(e) => setMarks(e.target.value)} />
            </div>
          </div>

          {needsOptions && (
            <div className="space-y-2">
              <Label>Options {type === "MCQ_MULTI" ? "(check all correct)" : "(select correct)"}</Label>
              <div className="space-y-2">
                {options.map((o, i) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <input
                      type={type === "MCQ_MULTI" ? "checkbox" : "radio"}
                      name="correct"
                      checked={correctIds.includes(o.id)}
                      onChange={() => toggleCorrect(o.id)}
                      className="h-4 w-4 shrink-0"
                      aria-label="Mark correct"
                    />
                    <Input
                      value={o.text}
                      disabled={type === "TRUE_FALSE"}
                      placeholder={`Option ${i + 1}`}
                      onChange={(e) =>
                        setOptions((prev) => prev.map((p) => (p.id === o.id ? { ...p, text: e.target.value } : p)))
                      }
                    />
                    {type !== "TRUE_FALSE" && options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setOptions((prev) => prev.filter((p) => p.id !== o.id));
                          setCorrectIds((prev) => prev.filter((x) => x !== o.id));
                        }}
                        aria-label="Remove option"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {type !== "TRUE_FALSE" && (
                <Button variant="outline" size="sm" onClick={() => setOptions((prev) => [...prev, { id: newId(), text: "" }])}>
                  <Plus className="mr-1 h-4 w-4" /> Add option
                </Button>
              )}
            </div>
          )}

          {type === "SHORT_ANSWER" && (
            <div className="space-y-2">
              <Label>Correct answer</Label>
              <Input value={correctText} onChange={(e) => setCorrectText(e.target.value)} placeholder="Expected answer" />
            </div>
          )}

          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const on = tagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTagIds((prev) => (on ? prev.filter((x) => x !== t.id) : [...prev, t.id]))}
                    >
                      <Badge variant={on ? "default" : "outline"}>{t.name}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={save} disabled={busy}>{editing ? "Save changes" : "Create question"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
