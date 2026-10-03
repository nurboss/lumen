"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, Clock, ArrowRight, Timer, ListChecks, SkipForward } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { postJson } from "@/lib/client-api";

// One question is shown at a time, each with a fixed countdown. When it runs
// out the quiz moves on and the unanswered question is simply skipped.
const SECONDS_PER_QUESTION = 60;

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
  durationMinutes: number | null;
  questions: RunnerQuestion[];
}

type Result = { score: number; maxScore: number; passed: boolean; showResult: boolean };

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function QuizRunner({
  quiz,
  embedded = false,
  alreadyCompleted = false,
  onCompleted,
}: {
  quiz: RunnerQuiz;
  /** Hide the standalone page chrome (eyebrow + big title) when rendered inside the player stage. */
  embedded?: boolean;
  /** The user has already submitted this quiz in a previous session. */
  alreadyCompleted?: boolean;
  /** Fired once a submission succeeds, so the player can unlock the Next control. */
  onCompleted?: (result: Result) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_QUESTION);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Refs let the timer and submit stay stable so selecting an answer never
  // resets the running countdown.
  const answersRef = useRef(answers);
  const currentRef = useRef(current);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const totalQuestions = quiz.questions.length;

  // Reset the countdown whenever we start or move to a new question — done in
  // render so there's no flash of the previous question's remaining time.
  const timerKey = `${started}-${current}`;
  const [prevTimerKey, setPrevTimerKey] = useState(timerKey);
  if (timerKey !== prevTimerKey) {
    setPrevTimerKey(timerKey);
    setSecondsLeft(SECONDS_PER_QUESTION);
  }

  function setSingle(qid: string, optId: string) {
    setAnswers((a) => ({ ...a, [qid]: optId }));
  }
  function toggleMulti(qid: string, optId: string) {
    setAnswers((a) => {
      const cur = Array.isArray(a[qid]) ? (a[qid] as string[]) : [];
      return { ...a, [qid]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId] };
    });
  }

  const submit = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await postJson<Result>("/api/quiz_result/add", {
      quizId: quiz.id,
      answers: answersRef.current,
    });
    setLoading(false);
    if ("error" in res) return setError(res.error);
    setResult(res.data);
    onCompleted?.(res.data);
  }, [quiz.id, onCompleted]);

  const goNext = useCallback(() => {
    const c = currentRef.current;
    if (c < totalQuestions - 1) setCurrent(c + 1);
    else void submit();
  }, [totalQuestions, submit]);

  // Per-question countdown, driven off a wall-clock deadline so it survives
  // re-renders. Resets whenever the active question changes.
  useEffect(() => {
    if (!started || result) return;
    const deadline = Date.now() + SECONDS_PER_QUESTION * 1000;
    const id = setInterval(() => {
      const remaining = Math.ceil((deadline - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(id);
        setSecondsLeft(0);
        goNext();
      } else {
        setSecondsLeft(remaining);
      }
    }, 250);
    return () => clearInterval(id);
  }, [started, current, result, goNext]);

  // ---- Result / already-completed ----
  if (result || alreadyCompleted) {
    const passed = result?.passed ?? true;
    return (
      <Card>
        <CardContent className="p-8 text-center">
          {passed ? (
            <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
          ) : (
            <XCircle className="mx-auto h-14 w-14 text-destructive" />
          )}
          <h2 className="mt-4 font-heading text-2xl font-bold text-foreground">
            {result ? (passed ? "Passed!" : "Not passed") : "Quiz submitted"}
          </h2>
          {result?.showResult ? (
            <p className="mt-2 text-muted-foreground">
              You scored <strong className="text-foreground">{result.score}</strong> / {result.maxScore}
            </p>
          ) : (
            <p className="mt-2 text-muted-foreground">
              {result ? "Your answers were recorded." : "You already completed this quiz. Continue when you're ready."}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ---- Intro / rules ----
  if (!started) {
    const totalMinutes = Math.ceil((totalQuestions * SECONDS_PER_QUESTION) / 60);
    return (
      <div>
        {!embedded && (
          <>
            <span className="eyebrow">Quiz</span>
            <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">{quiz.title}</h1>
          </>
        )}
        <Card className={embedded ? undefined : "mt-6"}>
          <CardHeader>
            <CardTitle>Ready to start?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat icon={ListChecks} label="Questions" value={String(totalQuestions)} />
              <Stat icon={Timer} label="Per question" value="1 min" />
              <Stat icon={Clock} label="Total time" value={`~${totalMinutes} min`} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">How it works</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <RuleRow>One question is shown at a time.</RuleRow>
                <RuleRow>You have 1 minute per question — the timer starts as soon as the question appears.</RuleRow>
                <RuleRow>If time runs out, the question is skipped and you move to the next one.</RuleRow>
                <RuleRow>You can move on early, but you can&apos;t go back to a previous question.</RuleRow>
              </ul>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={() => setStarted(true)} disabled={totalQuestions === 0} className="w-full sm:w-auto">
              Start quiz <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            {totalQuestions === 0 && (
              <p className="text-sm text-muted-foreground">This quiz has no questions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Running: one question at a time ----
  const q = quiz.questions[current];
  const isMulti = q.type === "MCQ_MULTI";
  const isLast = current === totalQuestions - 1;
  const answered = isMulti
    ? Array.isArray(answers[q.id]) && (answers[q.id] as string[]).length > 0
    : Boolean(answers[q.id]);
  const lowTime = secondsLeft <= 10;

  return (
    <div>
      {/* Progress + timer */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">
          Question <span className="text-foreground">{current + 1}</span> of {totalQuestions}
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums transition-colors",
            lowTime ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground"
          )}
          role="timer"
          aria-live="off"
        >
          <Timer className="h-4 w-4" /> {formatTime(secondsLeft)}
        </span>
      </div>
      <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((current + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      <Card key={q.id}>
        <CardHeader>
          <CardTitle className="text-base leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: q.text }} />
            <span className="ml-2 text-xs font-normal text-muted-foreground">({q.marks} marks)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {q.options.map((opt) => {
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

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">
          {answered ? "Answer selected" : "No answer selected — this one will be skipped"}
        </span>
        <Button onClick={goNext} disabled={loading}>
          {isLast ? (loading ? "Submitting…" : "Submit quiz") : "Next question"}
          {!isLast && (answered ? <ArrowRight className="ml-1 h-4 w-4" /> : <SkipForward className="ml-1 h-4 w-4" />)}
        </Button>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function RuleRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <span>{children}</span>
    </li>
  );
}
