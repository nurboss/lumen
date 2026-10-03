"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Upload,
  ImageIcon,
  Video,
  FileText,
  ClipboardList,
  Layers,
} from "lucide-react";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { postJson } from "@/lib/client-api";
import { formatBdt, effectivePrice } from "@/lib/format";
import { toast } from "sonner";

const TYPES = ["VIDEO", "ONLINE", "OFFLINE"] as const;
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
const LANGUAGES = ["bn", "en", "hi"] as const;
const DURATION_UNITS = ["SECOND", "MINUTE", "HOUR", "DAY", "WEEK", "MONTH", "YEAR"] as const;
const VIDEO_PROVIDERS = ["YOUTUBE", "VIMEO"] as const;

const STEPS = [
  "Course Overview",
  "Accessibility & Media",
  "Curriculum",
] as const;

const STEP_HINTS = [
  "Core details, pricing and what students will learn.",
  "Thumbnail and promo video.",
  "Build the ordered sections, units, quizzes and assignments.",
] as const;

/* Sensible starting values for a brand-new course so admins only tweak the
   title, category and price instead of filling every field from scratch. */
const NEW_DEFAULTS = {
  shortTitle: "Complete Course",
  description:
    "A complete, beginner-friendly course that takes you from the fundamentals to real-world application with clear, practical lessons.",
  duration: "3",
  regularPrice: "1000",
  sellPrice: "500",
  whatWillBeTaught: [
    "Master the core concepts step by step",
    "Practice with real, hands-on examples",
    "Apply your new skills to real projects",
  ],
  aboutCourse: [
    { title: "Who is this course for?", answer: "Anyone who wants to build strong fundamentals and learn at their own pace." },
    { title: "What do I need to get started?", answer: "Just a device with internet access and the willingness to learn." },
  ],
  badgePercentage: "80",
  certificatePassingPercentage: "50",
  badgeTitle: "Excellence Award",
  curriculum: [{ title: "Introduction", items: [] as CurriculumItem[] }],
} as const;

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

interface Qa {
  title: string;
  answer: string;
}
interface CourseInstructor {
  userId: string;
  category: string;
}
// Every curriculum item now references an existing record (unit / quiz / assignment)
// picked from a searchable dropdown, identified by its id.
type CurriculumKind = "unit" | "quiz" | "assignment";
interface CurriculumItem {
  kind: CurriculumKind;
  refId: string;
}
interface CurriculumSection {
  title: string;
  items: CurriculumItem[];
}

// Read-only shape of an existing course's saved curriculum (edit mode).
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

interface Course {
  id: string;
  title: string;
  shortTitle: string | null;
  description: string | null;
  categoryId: string | null;
  authorId: string | null;
  type: string;
  status: string;
  level: string;
  language: string;
  thumbnailUrl: string | null;
  videoProvider: string | null;
  previewVideoUrl: string | null;
  startDate: string | null;
  duration: number | null;
  durationUnit: string | null;
  maximumStudents: number | null;
  regularPrice: number;
  sellPrice: number;
  isFree: boolean;
  autoEvaluation: boolean;
  unitCompletionLock: boolean;
  completionCertificate: boolean;
  hideExpiredBatches: boolean;
  whatWillLearn: string[] | null;
  aboutFaq: Qa[] | null;
  faq: Qa[] | null;
  badgePercentage: number | null;
  certificatePassingPercent: number | null;
  badgeTitle: string | null;
  badgeImageUrl: string | null;
  certificateTemplateId: string | null;
  prerequisiteCourseId: string | null;
  courseRetakes: number | null;
  instructors: CourseInstructor[];
  sections: SavedSection[];
  category: { name: string } | null;
  author: { fullName: string } | null;
  _count: { enrollments: number };
}

interface Opt {
  id: string;
  name?: string;
  title?: string;
  fullName?: string;
}

interface ManagerProps {
  courses: Course[];
  categories: Opt[];
  authors: Opt[];
  certificateTemplates: Opt[];
  courseOptions: Opt[];
  units: UnitOpt[];
  quizzes: Opt[];
  assignments: Opt[];
}

export function CourseManager(props: ManagerProps) {
  const { courses } = props;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(id: string) {
    if (!confirm("Delete this course?")) return;
    setBusy(true);
    const res = await postJson("/api/admin/course", { action: "delete", id });
    setBusy(false);
    if (!("error" in res)) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> New course
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Link href={`/courseDetails/${c.id}`} className="hover:text-primary">{c.title}</Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.category?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.author?.fullName ?? "—"}</TableCell>
                <TableCell>{c.isFree ? "Free" : formatBdt(effectivePrice(c))}</TableCell>
                <TableCell>
                  <Badge variant={c.status === "PUBLISHED" ? "default" : "secondary"}>{c.status}</Badge>
                </TableCell>
                <TableCell>{c._count.enrollments}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={busy} onClick={() => remove(c.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {courses.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">No courses yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {open && (
        <CourseWizard
          key={editing?.id ?? "new"}
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          {...props}
          onSaved={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

const NONE = "__none__";

function toDateInput(iso: string | null) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

function optLabel(o: Opt) {
  return o.name ?? o.title ?? o.fullName ?? o.id;
}

/** Upload a file to Supabase via /api/upload; returns the public URL. */
async function uploadImage(file: File, prefix: string): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!["jpg", "jpeg", "png"].includes(ext)) {
    throw new Error("Image must be a jpg, jpeg or png file.");
  }
  const fd = new FormData();
  fd.append("file", file);
  fd.append("prefix", prefix);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Upload failed.");
  return json.data.url as string;
}

function CourseWizard({
  open,
  onOpenChange,
  editing,
  categories,
  authors,
  certificateTemplates,
  courseOptions,
  units,
  quizzes,
  assignments,
  onSaved,
}: ManagerProps & {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Course | null;
  onSaved: () => void;
}) {
  const isNew = !editing;
  const [step, setStep] = useState(0);
  const unitsById = new Map(units.map((u) => [u.id, u]));

  // Step 1 — Overview
  const [title, setTitle] = useState(editing?.title ?? "");
  const [shortTitle, setShortTitle] = useState(editing?.shortTitle ?? (isNew ? NEW_DEFAULTS.shortTitle : ""));
  const [description, setDescription] = useState(editing?.description ?? (isNew ? NEW_DEFAULTS.description : ""));
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? NONE);
  const [authorId, setAuthorId] = useState(editing?.authorId ?? NONE);
  const [type, setType] = useState(editing?.type ?? "VIDEO");
  const [status, setStatus] = useState(editing?.status ?? (isNew ? "PUBLISHED" : "DRAFT"));
  const [level, setLevel] = useState(editing?.level ?? "BEGINNER");
  const [language, setLanguage] = useState(editing?.language ?? "bn");
  const [startDate, setStartDate] = useState(toDateInput(editing?.startDate ?? null) || (isNew ? todayInput() : ""));
  const [duration, setDuration] = useState(editing?.duration?.toString() ?? (isNew ? NEW_DEFAULTS.duration : ""));
  const [durationUnit, setDurationUnit] = useState(editing?.durationUnit ?? "MONTH");
  const [maximumStudents, setMaximumStudents] = useState(editing?.maximumStudents?.toString() ?? "");
  const [regularPrice, setRegularPrice] = useState(editing ? String(editing.regularPrice / 100) : NEW_DEFAULTS.regularPrice);
  const [sellPrice, setSellPrice] = useState(editing ? String(editing.sellPrice / 100) : NEW_DEFAULTS.sellPrice);
  const [whatWillBeTaught, setWhatWillBeTaught] = useState<string[]>(editing?.whatWillLearn ?? [...NEW_DEFAULTS.whatWillBeTaught]);
  const [aboutCourse, setAboutCourse] = useState<Qa[]>(editing?.aboutFaq ?? NEW_DEFAULTS.aboutCourse.map((a) => ({ ...a })));
  const [isFree, setIsFree] = useState(editing?.isFree ?? false);
  const [autoEvaluation, setAutoEvaluation] = useState(editing?.autoEvaluation ?? false);
  const [unitCompletionLock, setUnitCompletionLock] = useState(editing?.unitCompletionLock ?? false);

  // Step 2 — Accessibility & Media
  const [badgePercentage, setBadgePercentage] = useState(editing?.badgePercentage?.toString() ?? (isNew ? NEW_DEFAULTS.badgePercentage : ""));
  const [certificatePassingPercentage, setCertificatePassingPercentage] = useState(
    editing?.certificatePassingPercent?.toString() ?? (isNew ? NEW_DEFAULTS.certificatePassingPercentage : "")
  );
  const [badgeTitle, setBadgeTitle] = useState(editing?.badgeTitle ?? (isNew ? NEW_DEFAULTS.badgeTitle : ""));
  const [certificateTemplateId, setCertificateTemplateId] = useState(editing?.certificateTemplateId ?? NONE);
  const [badgeImageUrl, setBadgeImageUrl] = useState(editing?.badgeImageUrl ?? "");
  const [completionCertificate, setCompletionCertificate] = useState(editing?.completionCertificate ?? false);
  const [prerequisiteCourseId, setPrerequisiteCourseId] = useState(editing?.prerequisiteCourseId ?? NONE);
  const [courseRetakes, setCourseRetakes] = useState(editing?.courseRetakes?.toString() ?? "");
  const [hideExpiredBatches, setHideExpiredBatches] = useState(editing?.hideExpiredBatches ?? false);
  const [thumbnailUrl, setThumbnailUrl] = useState(editing?.thumbnailUrl ?? "");
  const [videoProvider, setVideoProvider] = useState(editing?.videoProvider ?? NONE);
  const [previewVideoUrl, setPreviewVideoUrl] = useState(editing?.previewVideoUrl ?? "");
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingBadge, setUploadingBadge] = useState(false);

  // Step 3 — Curriculum (create-only)
  const [curriculum, setCurriculum] = useState<CurriculumSection[]>(
    isNew ? NEW_DEFAULTS.curriculum.map((s) => ({ ...s, items: [] })) : []
  );

  // Instructors & FAQ are preserved as-is (their editor steps were removed).
  const instructors: CourseInstructor[] = editing?.instructors ?? [];
  const faqQuestions: Qa[] = editing?.faq ?? [];

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (title.trim().length < 2) return "Course Title is required (min 2 chars).";
    if (categoryId === NONE) return "Course Category is required.";
    if (!whatWillBeTaught.some((t) => t.trim())) return "Add at least one 'What will be taught' item.";
    if (!startDate) return "Course Start Date is required.";
    if (!duration) return "Course Duration is required.";
    if (!shortTitle.trim()) return "Short Title is required.";
    if (!isFree && (!regularPrice || !sellPrice)) return "Regular and Sell price are required.";
    if (!aboutCourse.some((a) => a.title.trim())) return "Add at least one 'About Course' item.";
    if (!badgePercentage) return "Badge Percentage is required.";
    if (!certificatePassingPercentage) return "Certificate Passing Percentage is required.";
    if (!badgeTitle.trim()) return "Badge Title is required.";
    return null;
  }

  async function submit() {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      toast.error(v);
      return;
    }
    setBusy(true);
    const res = await postJson("/api/admin/course", {
      action: editing ? "update" : "create",
      ...(editing ? { id: editing.id } : {}),
      title: title.trim(),
      shortTitle: shortTitle.trim(),
      description: description.trim(),
      categoryId: categoryId === NONE ? "" : categoryId,
      authorId: authorId === NONE ? "" : authorId,
      type,
      status,
      level,
      language,
      startDate,
      duration: duration ? Number(duration) : undefined,
      durationUnit,
      maximumStudents: maximumStudents ? Number(maximumStudents) : undefined,
      regularPrice: regularPrice ? Number(regularPrice) : 0,
      sellPrice: sellPrice ? Number(sellPrice) : 0,
      isFree,
      autoEvaluation,
      unitCompletionLock,
      whatWillBeTaught: whatWillBeTaught.map((t) => t.trim()).filter(Boolean),
      aboutCourse: aboutCourse.filter((a) => a.title.trim()).map((a) => ({ title: a.title.trim(), answer: a.answer })),
      // Step 2
      badgePercentage: badgePercentage ? Number(badgePercentage) : undefined,
      certificatePassingPercentage: certificatePassingPercentage ? Number(certificatePassingPercentage) : undefined,
      badgeTitle: badgeTitle.trim(),
      badgeImageUrl,
      certificateTemplateId: certificateTemplateId === NONE ? "" : certificateTemplateId,
      completionCertificate,
      prerequisiteCourseId: prerequisiteCourseId === NONE ? "" : prerequisiteCourseId,
      courseRetakes: courseRetakes ? Number(courseRetakes) : undefined,
      hideExpiredBatches,
      thumbnailUrl,
      videoProvider: videoProvider === NONE ? "" : videoProvider,
      previewVideoUrl: previewVideoUrl.trim(),
      // Step 3 — only sent for new courses. Ordered items of any kind; units copy
      // the picked unit's content, quizzes/assignments reference an existing id.
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
      // Step 4
      instructors: instructors.filter((i) => i.userId),
      // Step 5
      faqQuestions: faqQuestions.filter((f) => f.title.trim()).map((f) => ({ title: f.title.trim(), answer: f.answer })),
    });
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      toast.error(res.error);
      return;
    }
    toast.success(editing ? "Course updated." : "Course created.");
    onSaved();
  }

  async function handleUpload(
    file: File,
    prefix: string,
    setUrl: (u: string) => void,
    setLoading: (b: boolean) => void
  ) {
    setError(null);
    setLoading(true);
    try {
      setUrl(await uploadImage(file, prefix));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[90vw] max-w-[90vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[90vw]">
        {/* Fixed header + stepper */}
        <div className="space-y-5 border-b bg-card px-6 pt-5 pb-5">
          <DialogHeader className="space-y-1">
            <p className="eyebrow">{editing ? "Manage course" : "New course"}</p>
            <DialogTitle className="font-heading text-xl leading-tight">
              {editing ? editing.title || "Edit course" : "Create a course"}
            </DialogTitle>
          </DialogHeader>
          <Stepper step={step} setStep={setStep} />
        </div>

        {/* Scrollable body */}
        <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="margin-note">
            <p className="eyebrow">Step {step + 1} of {STEPS.length}</p>
            <h3 className="font-heading text-lg font-semibold">{STEPS[step]}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{STEP_HINTS[step]}</p>
          </div>

          {step === 0 && (
            <StepOverview
              {...{
                isNew,
                categories, authors,
                title, setTitle, shortTitle, setShortTitle, description, setDescription,
                categoryId, setCategoryId, authorId, setAuthorId, type, setType, status, setStatus,
                level, setLevel, language, setLanguage, startDate, setStartDate, duration, setDuration,
                durationUnit, setDurationUnit, maximumStudents, setMaximumStudents,
                regularPrice, setRegularPrice, sellPrice, setSellPrice,
                whatWillBeTaught, setWhatWillBeTaught, aboutCourse, setAboutCourse,
                isFree, setIsFree, autoEvaluation, setAutoEvaluation, unitCompletionLock, setUnitCompletionLock,
              }}
            />
          )}

          {step === 1 && (
            <StepMedia
              {...{
                isNew,
                certificateTemplates, courseOptions,
                badgePercentage, setBadgePercentage, certificatePassingPercentage, setCertificatePassingPercentage,
                badgeTitle, setBadgeTitle, certificateTemplateId, setCertificateTemplateId,
                badgeImageUrl, setBadgeImageUrl, completionCertificate, setCompletionCertificate,
                prerequisiteCourseId, setPrerequisiteCourseId, courseRetakes, setCourseRetakes,
                hideExpiredBatches, setHideExpiredBatches, thumbnailUrl, setThumbnailUrl,
                videoProvider, setVideoProvider, previewVideoUrl, setPreviewVideoUrl,
                uploadingThumb, uploadingBadge, setUploadingThumb, setUploadingBadge,
                editingId: editing?.id,
                onUploadThumb: (f: File) => handleUpload(f, "thumbnails", setThumbnailUrl, setUploadingThumb),
                onUploadBadge: (f: File) => handleUpload(f, "banners", setBadgeImageUrl, setUploadingBadge),
              }}
            />
          )}

          {step === 2 && (
            <StepCurriculum
              isNew={isNew}
              curriculum={curriculum}
              setCurriculum={setCurriculum}
              units={units}
              quizzes={quizzes}
              assignments={assignments}
              savedSections={editing?.sections ?? []}
            />
          )}

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Sticky footer */}
        <div className="border-t bg-card px-6 py-3.5">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Back
            </Button>
            <div className="flex items-center gap-3">
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Continue</Button>
              ) : (
                <Button onClick={submit} disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save changes" : "Create course"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Small shared field helpers                                          */
/* ------------------------------------------------------------------ */

function Stepper({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  return (
    <ol className="flex items-center">
      {STEPS.map((s, i) => {
        const state = i === step ? "active" : i < step ? "done" : "todo";
        return (
          <li key={s} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className="group flex items-center gap-2.5 text-left"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                  state === "active"
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/15"
                    : state === "done"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/20"
                }`}
              >
                {state === "done" ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={`hidden text-sm font-medium transition sm:inline ${
                  state === "todo" ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {s}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span
                className={`mx-3 h-0.5 flex-1 rounded-full transition-colors ${
                  i < step ? "bg-primary/40" : "bg-border"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="space-y-0.5">
        <h4 className="font-heading text-sm font-semibold text-foreground">{title}</h4>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background px-3.5 py-3 text-sm transition hover:border-muted-foreground/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
      />
      <span className="min-w-0">
        <span className="block font-medium leading-tight">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 1 — Overview                                                   */
/* ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */
function StepOverview(p: any) {
  return (
    <div className="space-y-5">
      <Group title="Basics" hint="The essentials students see first.">

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Course Category *" value={p.categoryId} onChange={p.setCategoryId}>
            <SelectItem value={NONE}>— Select category —</SelectItem>
            {p.categories.map((c: Opt) => <SelectItem key={c.id} value={c.id}>{optLabel(c)}</SelectItem>)}
          </SelectField>
          <div className="space-y-2">
            <Label>Course Title *</Label>
            <Input value={p.title} onChange={(e: any) => p.setTitle(e.target.value)} placeholder="Course title" />
          </div>
          {!p.isNew && (
            <div className="space-y-2">
              <Label>Short Title *</Label>
              <Input value={p.shortTitle} onChange={(e: any) => p.setShortTitle(e.target.value)} placeholder="Card subtitle" />
            </div>
          )}
          <SelectField label="Status" value={p.status} onChange={p.setStatus}>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectField>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={p.description} onChange={(e: any) => p.setDescription(e.target.value)} rows={4} />
        </div>
        {!p.isNew && (
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Course Type *" value={p.type} onChange={p.setType}>
              {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectField>
            <SelectField label="Language *" value={p.language} onChange={p.setLanguage}>
              {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectField>
            <SelectField label="Level *" value={p.level} onChange={p.setLevel}>
              {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectField>
          </div>
        )}
      </Group>

      <Group title="Pricing & schedule" hint="Set what students pay and when the course runs.">

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Regular Price (৳) *</Label>
            <Input type="number" min={0} value={p.regularPrice} disabled={p.isFree}
              onChange={(e: any) => p.setRegularPrice(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Sell Price (৳) *</Label>
            <Input type="number" min={0} value={p.sellPrice} disabled={p.isFree}
              onChange={(e: any) => p.setSellPrice(e.target.value)} />
          </div>
          {!p.isNew && (
            <div className="space-y-2">
              <Label>Maximum Students</Label>
              <Input type="number" min={0} value={p.maximumStudents} onChange={(e: any) => p.setMaximumStudents(e.target.value)} />
            </div>
          )}
        </div>
        {!p.isNew && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Course Start Date *</Label>
                <Input type="date" value={p.startDate} onChange={(e: any) => p.setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Total Duration *</Label>
                <Input type="number" min={0} value={p.duration} onChange={(e: any) => p.setDuration(e.target.value)} />
              </div>
              <SelectField label="Duration Parameter *" value={p.durationUnit} onChange={p.setDurationUnit}>
                {DURATION_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectField>
            </div>
            <SelectField label="Author" value={p.authorId} onChange={p.setAuthorId}>
              <SelectItem value={NONE}>— Me —</SelectItem>
              {p.authors.map((a: Opt) => <SelectItem key={a.id} value={a.id}>{optLabel(a)}</SelectItem>)}
            </SelectField>
          </>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Toggle label="Free Course" checked={p.isFree} onChange={p.setIsFree} />
          {!p.isNew && <Toggle label="Auto Evaluation" checked={p.autoEvaluation} onChange={p.setAutoEvaluation} />}
          {!p.isNew && <Toggle label="Unit Completion Lock" checked={p.unitCompletionLock} onChange={p.setUnitCompletionLock} />}
        </div>
      </Group>

      <Group title="What students get" hint="Sell the outcome — the skills and answers that win enrolments.">

        <RepeatableText
          label="What will be taught *"
          items={p.whatWillBeTaught}
          setItems={p.setWhatWillBeTaught}
          placeholder="e.g. Build REST APIs"
        />
        <RepeatableQa label="About Course *" items={p.aboutCourse} setItems={p.setAboutCourse} />
      </Group>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2 — Accessibility & Media                                      */
/* ------------------------------------------------------------------ */

function StepMedia(p: any) {
  return (
    <div className="space-y-5">
      {!p.isNew && (
        <Group title="Badge & certificate" hint="Reward students who complete the course.">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Badge Percentage * (0–100)</Label>
              <Input type="number" min={0} max={100} value={p.badgePercentage}
                onChange={(e: any) => p.setBadgePercentage(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Certificate Passing % * (0–100)</Label>
              <Input type="number" min={0} max={100} value={p.certificatePassingPercentage}
                onChange={(e: any) => p.setCertificatePassingPercentage(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Badge Title *</Label>
              <Input value={p.badgeTitle} onChange={(e: any) => p.setBadgeTitle(e.target.value)} />
            </div>
          </div>
          <SelectField label="Certificate Template" value={p.certificateTemplateId} onChange={p.setCertificateTemplateId}>
            <SelectItem value={NONE}>— None —</SelectItem>
            {p.certificateTemplates.map((t: Opt) => <SelectItem key={t.id} value={t.id}>{optLabel(t)}</SelectItem>)}
          </SelectField>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle label="Completion Certificate" checked={p.completionCertificate} onChange={p.setCompletionCertificate} />
            <Toggle label="Hide Expired Batches" checked={p.hideExpiredBatches} onChange={p.setHideExpiredBatches} />
          </div>
        </Group>
      )}

      <Group title="Media" hint="A sharp thumbnail and a short promo video help the course convert.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FileField
            label="Course thumbnail"
            hint="JPG or PNG · ~575×450 · ≤ 1 MB"
            url={p.thumbnailUrl}
            uploading={p.uploadingThumb}
            onFile={p.onUploadThumb}
            onClear={() => p.setThumbnailUrl("")}
            aspect="video"
          />
          {!p.isNew && (
            <FileField
              label="Excellence badge"
              hint="JPG or PNG · square"
              url={p.badgeImageUrl}
              uploading={p.uploadingBadge}
              onFile={p.onUploadBadge}
              onClear={() => p.setBadgeImageUrl("")}
              aspect="square"
            />
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Video source" value={p.videoProvider} onChange={p.setVideoProvider}>
            <SelectItem value={NONE}>— None —</SelectItem>
            {VIDEO_PROVIDERS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectField>
          <div className="space-y-2">
            <Label>Promo video link</Label>
            <Input value={p.previewVideoUrl} onChange={(e: any) => p.setPreviewVideoUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>
      </Group>

      {!p.isNew && (
        <Group title="Advanced" hint="Optional prerequisites and retake limits.">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Prerequisite Course" value={p.prerequisiteCourseId} onChange={p.setPrerequisiteCourseId}>
              <SelectItem value={NONE}>— None —</SelectItem>
              {p.courseOptions
                .filter((c: Opt) => c.id !== p.editingId)
                .map((c: Opt) => <SelectItem key={c.id} value={c.id}>{optLabel(c)}</SelectItem>)}
            </SelectField>
            <div className="space-y-2">
              <Label>Course Retakes</Label>
              <Input type="number" min={0} value={p.courseRetakes} onChange={(e: any) => p.setCourseRetakes(e.target.value)} />
            </div>
          </div>
        </Group>
      )}
    </div>
  );
}

function FileField({
  label,
  hint,
  url,
  uploading,
  onFile,
  onClear,
  aspect = "video",
}: {
  label: string;
  hint?: string;
  url: string;
  uploading: boolean;
  onFile: (f: File) => void;
  onClear: () => void;
  aspect?: "video" | "square";
}) {
  const inputId = `file-${label.replace(/[^a-z]/gi, "").toLowerCase()}`;
  const frame = aspect === "square" ? "aspect-square max-w-[9rem]" : "aspect-video";

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <input
        id={inputId}
        type="file"
        accept=".jpg,.jpeg,.png"
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.[0]) onFile(e.target.files[0]);
          e.target.value = "";
        }}
      />

      {url && !uploading ? (
        <div className={`group relative overflow-hidden rounded-xl border border-border ${frame}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`${label} preview`} className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-foreground/50 opacity-0 backdrop-blur-[1px] transition group-hover:opacity-100">
            <Button
              size="sm"
              variant="secondary"
              className="cursor-pointer"
              render={<label htmlFor={inputId} />}
            >
              <Upload className="mr-1 h-3.5 w-3.5" /> Replace
            </Button>
            <Button size="sm" variant="secondary" onClick={onClear}>
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition hover:border-primary/50 hover:bg-primary/5 ${frame}`}
        >
          {uploading ? (
            <>
              <Upload className="h-6 w-6 animate-pulse text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Uploading…</span>
            </>
          ) : (
            <>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ImageIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-foreground">Click to upload</span>
              {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
            </>
          )}
        </label>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3 — Curriculum builder                                         */
/* ------------------------------------------------------------------ */

/* Icon + accent colour for each curriculum item kind, keyed lower-case. */
const KIND_META = {
  unit: { Icon: Video, label: "Unit", tint: "text-primary bg-primary/10" },
  quiz: { Icon: ClipboardList, label: "Quiz", tint: "text-chart-5 bg-chart-5/10" },
  assignment: { Icon: FileText, label: "Assignment", tint: "text-accent-foreground bg-accent/25" },
} as const;

function StepCurriculum({
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
    return <SavedCurriculum sections={savedSections} />;
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
          <div key={i} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {/* Section header */}
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <Input
                value={section.title}
                placeholder="Section title"
                className="h-9 border-transparent bg-transparent px-2 font-heading text-sm font-semibold shadow-none focus-visible:border-input focus-visible:bg-background"
                onChange={(e) => update(i, { title: e.target.value })}
              />
              <div className="flex shrink-0 items-center">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === 0} onClick={() => moveSection(i, -1)} aria-label="Move section up"><ChevronUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === curriculum.length - 1} onClick={() => moveSection(i, 1)} aria-label="Move section down"><ChevronDown className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurriculum(curriculum.filter((_, idx) => idx !== i))} aria-label="Delete section">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Ordered items: units, quizzes and assignments in any order */}
            <div className="space-y-2 p-3">
              {section.items.length === 0 && (
                <p className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
                  Empty section. Add a unit, quiz or assignment below.
                </p>
              )}
              {section.items.map((item, ii) => {
                const meta = KIND_META[item.kind];
                return (
                  <div key={ii} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2">
                    <div className="flex flex-col">
                      <Button variant="ghost" size="icon" className="h-5 w-6" disabled={ii === 0} onClick={() => moveItem(i, ii, -1)} aria-label="Move item up"><ChevronUp className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-5 w-6" disabled={ii === section.items.length - 1} onClick={() => moveItem(i, ii, 1)} aria-label="Move item down"><ChevronDown className="h-3.5 w-3.5" /></Button>
                    </div>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${meta.tint}`} title={meta.label}>
                      <meta.Icon className="h-4 w-4" />
                    </span>

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

                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Remove item" onClick={() => removeItem(i, ii)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => addItem(i, { kind: "unit", refId: "" })}>
                  <Video className="mr-1.5 h-3.5 w-3.5" /> Unit
                </Button>
                <Button variant="outline" size="sm" disabled={hasQuiz} onClick={() => addItem(i, { kind: "quiz", refId: "" })}>
                  <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Quiz
                </Button>
                <Button variant="outline" size="sm" disabled={hasAssignment} onClick={() => addItem(i, { kind: "assignment", refId: "" })}>
                  <FileText className="mr-1.5 h-3.5 w-3.5" /> Assignment
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={() => setCurriculum([...curriculum, { title: "", items: [] }])}
      >
        <Plus className="mr-1 h-4 w-4" /> Add section
      </Button>
    </div>
  );
}

/* Read-only view of a saved course's curriculum, shown when editing. Editing
   sections/units in place is done from the Section and Unit managers so student
   progress is never destroyed. */
function SavedCurriculum({ sections }: { sections: SavedSection[] }) {
  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Layers className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-medium">No curriculum yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
          Add sections, units, quizzes and assignments from the Section and Unit managers.
        </p>
      </div>
    );
  }

  function itemMeta(item: SavedSectionItem) {
    const kind = item.kind.toLowerCase() as keyof typeof KIND_META;
    const title =
      item.unit?.title ?? item.quiz?.title ?? item.assignment?.title ?? "Untitled";
    return { ...KIND_META[kind], title };
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-border bg-muted/25 px-3 py-2.5 text-xs text-muted-foreground">
        This is the course&rsquo;s current curriculum. To add or reorder sections, units, quizzes
        and assignments, use the Section and Unit managers — that keeps existing student progress
        intact.
      </p>

      {sections.map((section, i) => (
        <div key={section.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <h4 className="font-heading text-sm font-semibold">{section.title}</h4>
            <span className="ml-auto text-xs text-muted-foreground">
              {section.items.length} {section.items.length === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="divide-y divide-border">
            {section.items.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">Empty section.</p>
            ) : (
              section.items.map((item) => {
                const meta = itemMeta(item);
                return (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${meta.tint}`}>
                      <meta.Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 truncate text-sm">{meta.title}</span>
                    <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {meta.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Searchable dropdown for picking an existing quiz / assignment. */
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

/* ------------------------------------------------------------------ */
/* Repeatable primitives                                               */
/* ------------------------------------------------------------------ */

function RepeatableText({
  label, items, setItems, placeholder,
}: { label: string; items: string[]; setItems: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={item} placeholder={placeholder}
            onChange={(e) => setItems(items.map((x, idx) => (idx === i ? e.target.value : x)))} />
          <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setItems([...items, ""])}>
        <Plus className="mr-1 h-4 w-4" /> Add
      </Button>
    </div>
  );
}

function RepeatableQa({
  label, items, setItems, allowEmpty,
}: { label: string; items: Qa[]; setItems: (v: Qa[]) => void; allowEmpty?: boolean }) {
  function update(i: number, patch: Partial<Qa>) {
    setItems(items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-md border border-border/70 p-2">
          <div className="flex items-center gap-2">
            <Input value={item.title} placeholder="Title / question"
              onChange={(e) => update(i, { title: e.target.value })} />
            <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Textarea value={item.answer} rows={2} placeholder="Answer"
            onChange={(e) => update(i, { answer: e.target.value })} />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setItems([...items, { title: "", answer: "" }])}>
        <Plus className="mr-1 h-4 w-4" /> Add{allowEmpty ? " question" : ""}
      </Button>
    </div>
  );
}
