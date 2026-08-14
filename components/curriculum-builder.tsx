"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronUp, ChevronDown, Lock, Unlock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { postJson } from "@/lib/client-api";

export interface BuilderUnit {
  id: string;
  title: string;
  isFree: boolean;
  order: number;
  publicVideoUrl: string | null;
}
export interface BuilderSection {
  id: string;
  title: string;
  order: number;
  units: BuilderUnit[];
}
export interface BuilderCourse {
  id: string;
  title: string;
  sections: BuilderSection[];
}

export function CurriculumBuilder({ courses }: { courses: BuilderCourse[] }) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [newSection, setNewSection] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-section new-unit draft state.
  const [unitDraft, setUnitDraft] = useState<Record<string, { title: string; url: string }>>({});

  const course = courses.find((c) => c.id === courseId);

  async function run(fn: () => Promise<{ error: string } | { data: unknown }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return false;
    }
    router.refresh();
    return true;
  }

  async function addSection() {
    if (!newSection.trim()) return;
    const ok = await run(() => postJson("/api/section/add", { courseId, title: newSection.trim() }));
    if (ok) setNewSection("");
  }

  async function addUnit(sectionId: string) {
    const draft = unitDraft[sectionId];
    if (!draft?.title?.trim()) return;
    const ok = await run(() =>
      postJson("/api/unit/add", {
        sectionId,
        title: draft.title.trim(),
        publicVideoUrl: draft.url?.trim() || "",
      })
    );
    if (ok) setUnitDraft((d) => ({ ...d, [sectionId]: { title: "", url: "" } }));
  }

  async function reorder(section: BuilderSection, index: number, dir: -1 | 1) {
    const ids = section.units.map((u) => u.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    await run(() => postJson("/api/courses/units_order", { sectionId: section.id, orderedUnitIds: ids }));
  }

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <Select value={courseId} onValueChange={(v) => setCourseId((v as string) ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {course && (
        <div className="space-y-4">
          {course.sections.map((section) => (
            <Card key={section.id}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-foreground">{section.title}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    onClick={() => run(() => postJson("/api/section/delete", { id: section.id }))}
                    aria-label="Delete section"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <ul className="space-y-1">
                  {section.units.map((unit, i) => (
                    <li key={unit.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                      <span className="flex-1 truncate">{unit.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={busy}
                        onClick={() =>
                          run(() => postJson("/api/unit/update", { id: unit.id, isFree: !unit.isFree }))
                        }
                        aria-label="Toggle free"
                        title={unit.isFree ? "Free preview" : "Locked"}
                      >
                        {unit.isFree ? <Unlock className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy || i === 0} onClick={() => reorder(section, i, -1)} aria-label="Move up">
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy || i === section.units.length - 1} onClick={() => reorder(section, i, 1)} aria-label="Move down">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy} onClick={() => run(() => postJson("/api/unit/delete", { id: unit.id }))} aria-label="Delete unit">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>

                {/* Add unit */}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Lesson title"
                    value={unitDraft[section.id]?.title ?? ""}
                    onChange={(e) =>
                      setUnitDraft((d) => ({ ...d, [section.id]: { ...d[section.id], title: e.target.value } }))
                    }
                  />
                  <Input
                    placeholder="Video URL (optional)"
                    value={unitDraft[section.id]?.url ?? ""}
                    onChange={(e) =>
                      setUnitDraft((d) => ({ ...d, [section.id]: { ...d[section.id], url: e.target.value } }))
                    }
                  />
                  <Button variant="outline" disabled={busy} onClick={() => addUnit(section.id)}>
                    <Plus className="mr-1 h-4 w-4" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add section */}
          <div className="flex gap-2">
            <Input placeholder="New section title" value={newSection} onChange={(e) => setNewSection(e.target.value)} />
            <Button disabled={busy} onClick={addSection}>
              <Plus className="mr-1 h-4 w-4" /> Add section
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
