"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Lock,
  ArrowLeft,
  ArrowRight,
  PlayCircle,
  FileDown,
  FileQuestion,
  ClipboardList,
  ChevronDown,
  Clock,
  Trophy,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { postJson } from "@/lib/client-api";
import { QuizRunner } from "@/components/quiz-runner";
import { AssignmentRunner } from "@/components/assignment-runner";
import { LessonVideoPlayer } from "@/components/lesson-video-player";
import type { PlayerData, PlayerItem } from "@/lib/curriculum";

// Fraction of a video that must be watched before the learner can advance.
const UNLOCK_RATIO = 0.8;

type QueueItem = PlayerItem & { sectionId: string; sectionTitle: string; index: number };

const keyOf = (it: { kind: string; id: string }) => `${it.kind}:${it.id}`;

function itemIcon(kind: PlayerItem["kind"]) {
  if (kind === "quiz") return FileQuestion;
  if (kind === "assignment") return ClipboardList;
  return PlayCircle;
}

export function CoursePlayer({ data }: { data: PlayerData }) {
  // Flatten the whole curriculum into a single ordered queue the learner walks
  // one item at a time — video, quiz, then assignment — with no skipping ahead.
  const queue = useMemo<QueueItem[]>(() => {
    let idx = 0;
    return data.sections.flatMap((s) =>
      s.items.map((it) => ({ ...it, sectionId: s.id, sectionTitle: s.title, index: idx++ }))
    );
  }, [data.sections]);

  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(queue.filter((i) => i.completed).map(keyOf))
  );

  // The frontier is the first not-yet-completed item; everything after it stays
  // locked until the learner works their way forward.
  const frontierIndex = useMemo(() => {
    const i = queue.findIndex((it) => !completed.has(keyOf(it)));
    return i === -1 ? queue.length : i;
  }, [queue, completed]);

  const [activeKey, setActiveKey] = useState<string>(() => {
    const f = queue.find((it) => !it.completed) ?? queue[0];
    return f ? keyOf(f) : "";
  });
  const active = queue.find((it) => keyOf(it) === activeKey) ?? queue[0];
  const activeIndex = active?.index ?? 0;
  const activeDone = active ? completed.has(keyOf(active)) : false;

  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(active ? [active.sectionId] : [])
  );
  const [videoRatio, setVideoRatio] = useState(0);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [finished, setFinished] = useState(false);

  const lastSaveRef = useRef(0);

  // Reset per-item view state when the active item changes, during render —
  // avoids the extra paint an effect would cause between switching lessons.
  const [prevKey, setPrevKey] = useState(activeKey);
  if (activeKey !== prevKey) {
    setPrevKey(activeKey);
    setShowFullDesc(false);
    setVideoRatio(activeDone ? 1 : 0);
  }

  const save = useCallback(async (unitId: string, body: Record<string, unknown>) => {
    await postJson("/api/course/enroll/progress/update", { unitId, ...body });
  }, []);

  const markUnitComplete = useCallback(
    (unitId: string) => {
      const k = `unit:${unitId}`;
      setCompleted((prev) => {
        if (prev.has(k)) return prev;
        const next = new Set(prev).add(k);
        return next;
      });
      void save(unitId, { completed: true });
    },
    [save]
  );

  const markItemComplete = useCallback((it: QueueItem) => {
    setCompleted((prev) => new Set(prev).add(keyOf(it)));
  }, []);

  function selectItem(it: QueueItem) {
    // Guard: never let the learner jump past the frontier.
    if (it.index > frontierIndex) return;
    setFinished(false);
    setActiveKey(keyOf(it));
    setOpenSections((prev) => new Set(prev).add(it.sectionId));
  }

  function goNext() {
    if (!active) return;
    if (active.kind === "unit") markUnitComplete(active.id);
    else markItemComplete(active);

    const next = queue[activeIndex + 1];
    if (next) {
      setActiveKey(keyOf(next));
      setOpenSections((prev) => new Set(prev).add(next.sectionId));
    } else {
      setFinished(true);
    }
  }

  function goPrev() {
    const prev = queue[activeIndex - 1];
    if (prev) selectItem(prev);
  }

  // ---- Video handlers -------------------------------------------------------
  function onVideoProgress(position: number, duration: number, saveImmediately = false) {
    if (!active || active.kind !== "unit") return;
    const now = Date.now();
    if (saveImmediately || now - lastSaveRef.current > 10_000) {
      lastSaveRef.current = now;
      void save(active.id, { lastPositionSeconds: Math.floor(position) });
    }
    if (duration > 0) {
      const ratio = position / duration;
      setVideoRatio((r) => (ratio > r ? ratio : r));
      if (ratio >= UNLOCK_RATIO && !activeDone) markUnitComplete(active.id);
    }
  }

  // ---- Advance gating -------------------------------------------------------
  const canAdvance =
    !!active &&
    (activeDone || (active.kind === "unit" && videoRatio >= UNLOCK_RATIO));
  const nextItem = queue[activeIndex + 1];
  const isLast = activeIndex === queue.length - 1;

  const completedCount = completed.size;
  const percent = queue.length ? Math.round((completedCount / queue.length) * 100) : 0;

  const videoSrc =
    active?.kind === "unit" ? active.publicVideoUrl || active.storageVideoUrl || "" : "";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ---- Stage ---- */}
      <div className="min-w-0 flex-1">
        <Link
          href="/student/my-course"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to my courses
        </Link>

        {finished ? (
          <CourseComplete title={data.course.title} />
        ) : active?.kind === "unit" ? (
          <>
            {videoSrc ? (
              <LessonVideoPlayer
                key={active.id}
                src={videoSrc}
                title={active.title}
                resumeAt={active.lastPositionSeconds}
                speed={speed}
                onSpeedChange={setSpeed}
                onProgress={onVideoProgress}
                onEnded={() => { if (!activeDone) markUnitComplete(active.id); }}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl border border-border bg-black text-sm text-muted-foreground">
                No video for this lesson.
              </div>
            )}

            {/* Watch-to-unlock meter */}
            {videoSrc && (
              <div className="mt-3 flex items-center gap-3">
                <Progress value={Math.min(100, Math.round(videoRatio * 100))} className="h-1.5 flex-1" />
                <span className="shrink-0 text-xs text-muted-foreground">
                  {activeDone
                    ? "Watched"
                    : `${Math.round(videoRatio * 100)}% · unlocks Next at ${Math.round(UNLOCK_RATIO * 100)}%`}
                </span>
              </div>
            )}

            <StageHeader
              eyebrow={`Lesson ${activeIndex + 1} of ${queue.length}`}
              title={active.title}
            >
              {activeDone && (
                <span className="inline-flex items-center gap-1 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4" /> Completed
                </span>
              )}
              {active.isFree && <Badge variant="outline">Free preview</Badge>}
              {active.duration ? (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" /> {active.duration} min
                </span>
              ) : null}
              {active.attachmentUrl && (
                <a
                  href={active.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <FileDown className="h-4 w-4" /> Resources
                </a>
              )}
            </StageHeader>

            {active.description && (
              <div className="mt-4">
                <div
                  className={cn(
                    "prose prose-sm max-w-none text-foreground",
                    !showFullDesc && "line-clamp-4"
                  )}
                  dangerouslySetInnerHTML={{ __html: active.description }}
                />
                <button
                  type="button"
                  onClick={() => setShowFullDesc((v) => !v)}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  {showFullDesc ? "Show less" : "Show more"}
                </button>
              </div>
            )}
          </>
        ) : active?.kind === "quiz" ? (
          <>
            <StageHeader eyebrow={`Quiz ${activeIndex + 1} of ${queue.length}`} title={active.title}>
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <FileQuestion className="h-4 w-4" /> {active.questions.length} questions
              </span>
              {active.durationMinutes ? (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" /> {active.durationMinutes} min
                </span>
              ) : null}
            </StageHeader>
            <div className="mt-5">
              <QuizRunner
                key={active.id}
                embedded
                alreadyCompleted={activeDone}
                quiz={{
                  id: active.id,
                  title: active.title,
                  durationMinutes: active.durationMinutes,
                  questions: active.questions,
                }}
                onCompleted={() => markItemComplete(active)}
              />
            </div>
          </>
        ) : active?.kind === "assignment" ? (
          <>
            <StageHeader
              eyebrow={`Assignment ${activeIndex + 1} of ${queue.length}`}
              title={active.title}
            >
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <ClipboardList className="h-4 w-4" /> {active.maximumMarks} marks
              </span>
            </StageHeader>
            <div className="mt-5">
              <AssignmentRunner
                key={active.id}
                alreadyCompleted={activeDone}
                assignment={{
                  id: active.id,
                  title: active.title,
                  description: active.description,
                  submissionType: active.submissionType,
                  maximumMarks: active.maximumMarks,
                }}
                onCompleted={() => markItemComplete(active)}
              />
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            This course has no content yet.
          </div>
        )}

        {/* ---- Action bar ---- */}
        {!finished && active && (
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrev}
              disabled={activeIndex === 0}
              className="text-muted-foreground"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Previous
            </Button>

            <div className="flex items-center gap-3">
              {nextItem && !isLast && (
                <span className="hidden max-w-[180px] truncate text-right text-xs text-muted-foreground sm:block">
                  Up next: <span className="text-foreground">{nextItem.title}</span>
                </span>
              )}
              <Button onClick={goNext} disabled={!canAdvance}>
                {isLast ? "Finish course" : "Next"}
                {!isLast && <ArrowRight className="ml-1 h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {!finished && active && !canAdvance && active.kind === "unit" && (
          <p className="mt-2 text-right text-xs text-muted-foreground">
            Watch {Math.round(UNLOCK_RATIO * 100)}% of the video to continue.
          </p>
        )}
        {!finished && active && !canAdvance && active.kind !== "unit" && (
          <p className="mt-2 text-right text-xs text-muted-foreground">
            {active.kind === "quiz" ? "Submit the quiz to continue." : "Submit the assignment to continue."}
          </p>
        )}
      </div>

      {/* ---- Curriculum rail ---- */}
      <aside className="w-full shrink-0 lg:w-80">
        <div className="sticky top-6 rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <p className="font-heading font-semibold text-foreground">{data.course.title}</p>
            <Progress value={percent} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {completedCount}/{queue.length} steps · {percent}%
            </p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {data.sections.map((section) => {
              const sectionItems = queue.filter((q) => q.sectionId === section.id);
              const open = openSections.has(section.id);
              const doneInSection = sectionItems.filter((i) => completed.has(keyOf(i))).length;
              return (
                <div key={section.id} className="mb-1">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSections((prev) => {
                        const n = new Set(prev);
                        if (n.has(section.id)) n.delete(section.id);
                        else n.add(section.id);
                        return n;
                      })
                    }
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-secondary"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        !open && "-rotate-90"
                      )}
                    />
                    <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                      {section.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {doneInSection}/{sectionItems.length}
                    </span>
                  </button>

                  {open && (
                    <ul className="relative ml-2 mt-1 pl-0">
                      {/* connecting track line behind the node icons */}
                      {sectionItems.length > 1 && (
                        <span className="absolute bottom-4 left-[15px] top-4 w-px bg-border" aria-hidden />
                      )}
                      {sectionItems.map((item) => {
                        const k = keyOf(item);
                        const isActive = k === activeKey && !finished;
                        const done = completed.has(k);
                        const locked = item.index > frontierIndex;
                        const Icon = itemIcon(item.kind);
                        return (
                          <li key={k} className="relative">
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() => selectItem(item)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-md py-2 pl-1 pr-2 text-left text-sm transition-colors",
                                isActive
                                  ? "bg-primary/10 text-foreground"
                                  : locked
                                  ? "cursor-not-allowed text-muted-foreground/60"
                                  : "hover:bg-secondary"
                              )}
                            >
                              <span
                                className={cn(
                                  "z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-card",
                                  done
                                    ? "border-primary text-primary"
                                    : isActive
                                    ? "border-primary text-primary"
                                    : "border-border text-muted-foreground"
                                )}
                              >
                                {locked ? (
                                  <Lock className="h-3.5 w-3.5" />
                                ) : done ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : isActive ? (
                                  <PlayCircle className="h-4 w-4" />
                                ) : (
                                  <Icon className="h-3.5 w-3.5" />
                                )}
                              </span>
                              <span className="line-clamp-2 min-w-0 flex-1">{item.title}</span>
                              {item.kind !== "unit" && (
                                <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
                                  {item.kind === "quiz" ? "Quiz" : "Task"}
                                </Badge>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

function StageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <span className="eyebrow">{eyebrow}</span>
      <h1 className="mt-1 font-heading text-2xl font-bold text-foreground">{title}</h1>
      {children && <div className="mt-2 flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

function CourseComplete({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Trophy className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mt-5 font-heading text-2xl font-bold text-foreground">Course complete</h1>
      <p className="mt-2 text-muted-foreground">
        You finished every step of <span className="text-foreground">{title}</span>. Nice work.
      </p>
      <Link href="/student/my-course" className={cn(buttonVariants(), "mt-6")}>
        Back to my courses
      </Link>
    </div>
  );
}
