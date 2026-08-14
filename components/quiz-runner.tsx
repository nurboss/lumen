"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { postJson } from "@/lib/client-api";

export interface RunnerQuestion {
  id: string;
  text: string;
  type: string;
  options: { id: string; text: string }[];
  marks: number;
}
export interface RunnerQuiz {
  id: string;
  title: string;
  subtitle: string | null;
  durationMinutes: number | null;
  questions: RunnerQuestion[];
}

type Result = { score: number; maxScore: number; passed: boolean; showResult: boolean };

export function QuizRunner({ quiz }: { quiz: RunnerQuiz }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setSingle(qid: string, optId: string) {
    setAnswers((a) => ({ ...a, [qid]: optId }));
  }
  function toggleMulti(qid: string, optId: string) {
    setAnswers((a) => {
      const cur = Array.isArray(a[qid]) ? (a[qid] as string[]) : [];
      return { ...a, [qid]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId] };
    });
  }

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await postJson<Result>("/api/quiz_result/add", { quizId: quiz.id, answers });
    setLoading(false);
    if ("error" in res) return setError(res.error);
    setResult(res.data);
  }

  if (result) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          {result.passed ? (
            <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
          ) : (
            <XCircle className="mx-auto h-14 w-14 text-destructive" />
          )}
          <h2 className="mt-4 font-heading text-2xl font-bold text-foreground">
            {result.passed ? "Passed!" : "Not passed"}
          </h2>
          {result.showResult && (
            <p className="mt-2 text-muted-foreground">
              You scored <strong className="text-foreground">{result.score}</strong> / {result.maxScore}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <span className="eyebrow">Quiz</span>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">{quiz.title}</h1>
      {quiz.subtitle && <p className="mt-2 text-muted-foreground">{quiz.subtitle}</p>}

      <div className="mt-8 space-y-6">
        {quiz.questions.map((q, i) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {i + 1}. <span dangerouslySetInnerHTML={{ __html: q.text }} />
                <span className="ml-2 text-xs font-normal text-muted-foreground">({q.marks} marks)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {q.options.map((opt) => {
                const isMulti = q.type === "MCQ_MULTI";
                const selected = isMulti
                  ? Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(opt.id)
                  : answers[q.id] === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors",
                      selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                    )}
                  >
                    <input
                      type={isMulti ? "checkbox" : "radio"}
                      name={q.id}
                      checked={selected}
                      onChange={() => (isMulti ? toggleMulti(q.id, opt.id) : setSingle(q.id, opt.id))}
                      className="accent-primary"
                    />
                    <Label className="cursor-pointer font-normal">{opt.text}</Label>
                  </label>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <Button className="mt-6 w-full" onClick={submit} disabled={loading}>
        {loading ? "Submitting…" : "Submit quiz"}
      </Button>
    </div>
  );
}
