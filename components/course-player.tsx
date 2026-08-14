"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactPlayer from "react-player";
import { CheckCircle2, Circle, Lock, ArrowLeft, PlayCircle, FileDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { postJson } from "@/lib/client-api";
import type { PlayerData, PlayerUnit } from "@/lib/curriculum";

export function CoursePlayer({ data }: { data: PlayerData }) {
  const allUnits = useMemo(
    () => data.sections.flatMap((s) => s.units),
    [data.sections]
  );
  const firstPlayable =
    allUnits.find((u) => !u.locked && !u.completed) ??
    allUnits.find((u) => !u.locked) ??
    allUnits[0];

  const [activeId, setActiveId] = useState<string>(firstPlayable?.id ?? "");
  const [progress, setProgress] = useState(data.progressPercent);
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    () => new Set(allUnits.filter((u) => u.completed).map((u) => u.id))
  );

  const active = allUnits.find((u) => u.id === activeId) ?? firstPlayable;
  const lastSaveRef = useRef(0);
  const seededRef = useRef(false);

  const videoSrc = active?.publicVideoUrl || active?.storageVideoUrl || "";

  const save = useCallback(
    async (unitId: string, body: Record<string, unknown>) => {
      const res = await postJson<{ progressPercent: number }>(
        "/api/course/enroll/progress/update",
        { unitId, ...body }
      );
      if ("data" in res) setProgress(res.data.progressPercent);
    },
    []
  );

  const markComplete = useCallback(
    async (unit: PlayerUnit) => {
      if (completedIds.has(unit.id)) return;
      setCompletedIds((prev) => new Set(prev).add(unit.id));
      await save(unit.id, { completed: true });
    },
    [completedIds, save]
  );

  function onLoadedMetadata(e: React.SyntheticEvent<HTMLVideoElement>) {
    // Resume from last position once per unit load.
    if (!seededRef.current && active && active.lastPositionSeconds > 0) {
      try {
        e.currentTarget.currentTime = active.lastPositionSeconds;
      } catch {
        /* some providers disallow early seek */
      }
    }
    seededRef.current = true;
  }

  function onTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    if (!active) return;
    const el = e.currentTarget;
    const now = Date.now();
    // Throttle position saves to ~every 10s.
    if (now - lastSaveRef.current > 10_000) {
      lastSaveRef.current = now;
      void save(active.id, { lastPositionSeconds: Math.floor(el.currentTime) });
    }
    // Auto-complete at 90% watched.
    if (el.duration > 0 && el.currentTime / el.duration >= 0.9) {
      void markComplete(active);
    }
  }

  function selectUnit(unit: PlayerUnit) {
    if (unit.locked) return;
    seededRef.current = false;
    lastSaveRef.current = 0;
    setActiveId(unit.id);
  }

  const completedCount = completedIds.size;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Player + content */}
      <div className="min-w-0 flex-1">
        <Link href="/student/my-course" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to my courses
        </Link>

        <div className="overflow-hidden rounded-xl border border-border bg-black">
          <div className="aspect-video w-full">
            {videoSrc ? (
              <ReactPlayer
                key={active?.id}
                src={videoSrc}
                controls
                playsInline
                width="100%"
                height="100%"
                onLoadedMetadata={onLoadedMetadata}
                onTimeUpdate={onTimeUpdate}
                onEnded={() => active && markComplete(active)}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No video for this lesson.
              </div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <h1 className="font-heading text-2xl font-bold text-foreground">{active?.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {active && !completedIds.has(active.id) && (
              <Button size="sm" onClick={() => active && markComplete(active)}>
                Mark as complete
              </Button>
            )}
            {active && completedIds.has(active.id) && (
              <span className="flex items-center gap-1 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" /> Completed
              </span>
            )}
            {active?.attachmentUrl && (
              <a
                href={active.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <FileDown className="h-4 w-4" /> Resources
              </a>
            )}
          </div>
          {active?.description && (
            <div
              className="prose prose-sm mt-4 max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: active.description }}
            />
          )}
        </div>
      </div>

      {/* Curriculum sidebar */}
      <aside className="w-full shrink-0 lg:w-80">
        <div className="sticky top-6 rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <p className="font-heading font-semibold text-foreground">{data.course.title}</p>
            <Progress value={progress} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {completedCount}/{data.totalUnits} lessons · {Math.round(progress)}%
            </p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {data.sections.map((section) => (
              <div key={section.id} className="mb-2">
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </p>
                <ul>
                  {section.units.map((unit) => {
                    const isActive = unit.id === active?.id;
                    const done = completedIds.has(unit.id);
                    return (
                      <li key={unit.id}>
                        <button
                          type="button"
                          disabled={unit.locked}
                          onClick={() => selectUnit(unit)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                            isActive ? "bg-primary/10 text-foreground" : "hover:bg-secondary",
                            unit.locked && "cursor-not-allowed opacity-50"
                          )}
                        >
                          {unit.locked ? (
                            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : done ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                          ) : isActive ? (
                            <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="line-clamp-2">{unit.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
