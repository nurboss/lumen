"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, Check } from "lucide-react";
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

const TYPES = ["VIDEO", "ONLINE", "OFFLINE"] as const;
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
const LANGUAGES = ["bn", "en", "hi"] as const;
const DURATION_UNITS = ["SECOND", "MINUTE", "HOUR", "DAY", "WEEK", "MONTH", "YEAR"] as const;
const VIDEO_PROVIDERS = ["YOUTUBE", "VIMEO"] as const;
const UNIT_TYPES = ["VIDEO", "LIVE", "TEXT"] as const;
const INSTRUCTOR_ROLES = ["LEAD", "SUPPORT"] as const;

const STEPS = [
  "Course Overview",
  "Accessibility & Media",
  "Curriculum",
  "Instructor",
  "FAQ",
  "Submit",
] as const;

const STEP_HINTS = [
  "Core details, pricing and what students will learn.",
  "Badges, certificate, thumbnail and promo video.",
  "Build the ordered sections, units, quizzes and assignments.",
  "Assign one or more lead / support instructors.",
  "Optional frequently-asked questions.",
  "Review everything and create the course.",
] as const;

interface Qa {
  title: string;
  answer: string;
}
interface CourseInstructor {
  userId: string;
  category: string;
}
interface CurriculumUnit {
  title: string;
  type: string;
  description: string;
  isFree: boolean;
  publicVideoUrl: string;
  storageVideoUrl: string;
}
interface CurriculumSection {
  title: string;
  quizId: string;
  assignmentId: string;
  units: CurriculumUnit[];
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

  // Step 1 — Overview
  const [title, setTitle] = useState(editing?.title ?? "");
  const [shortTitle, setShortTitle] = useState(editing?.shortTitle ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? NONE);
  const [authorId, setAuthorId] = useState(editing?.authorId ?? NONE);
  const [type, setType] = useState(editing?.type ?? "VIDEO");
  const [status, setStatus] = useState(editing?.status ?? "DRAFT");
  const [level, setLevel] = useState(editing?.level ?? "BEGINNER");
  const [language, setLanguage] = useState(editing?.language ?? "bn");
  const [startDate, setStartDate] = useState(toDateInput(editing?.startDate ?? null));
  const [duration, setDuration] = useState(editing?.duration?.toString() ?? "");
  const [durationUnit, setDurationUnit] = useState(editing?.durationUnit ?? "MONTH");
  const [maximumStudents, setMaximumStudents] = useState(editing?.maximumStudents?.toString() ?? "");
  const [regularPrice, setRegularPrice] = useState(editing ? String(editing.regularPrice / 100) : "");
  const [sellPrice, setSellPrice] = useState(editing ? String(editing.sellPrice / 100) : "");
  const [whatWillBeTaught, setWhatWillBeTaught] = useState<string[]>(editing?.whatWillLearn ?? [""]);
  const [aboutCourse, setAboutCourse] = useState<Qa[]>(editing?.aboutFaq ?? [{ title: "", answer: "" }]);
  const [isFree, setIsFree] = useState(editing?.isFree ?? false);
  const [autoEvaluation, setAutoEvaluation] = useState(editing?.autoEvaluation ?? false);
  const [unitCompletionLock, setUnitCompletionLock] = useState(editing?.unitCompletionLock ?? false);

  // Step 2 — Accessibility & Media
  const [badgePercentage, setBadgePercentage] = useState(editing?.badgePercentage?.toString() ?? "");
  const [certificatePassingPercentage, setCertificatePassingPercentage] = useState(
    editing?.certificatePassingPercent?.toString() ?? ""
  );
  const [badgeTitle, setBadgeTitle] = useState(editing?.badgeTitle ?? "");
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
  const [curriculum, setCurriculum] = useState<CurriculumSection[]>([]);

  // Step 4 — Instructors
  const [instructors, setInstructors] = useState<CourseInstructor[]>(
    editing?.instructors?.length ? editing.instructors : [{ userId: "", category: "LEAD" }]
  );

  // Step 5 — FAQ
  const [faqQuestions, setFaqQuestions] = useState<Qa[]>(editing?.faq ?? []);

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
    if (!instructors.some((i) => i.userId)) return "Assign at least one instructor.";
    return null;
  }

  async function submit() {
    setError(null);
    const v = validate();
    if (v) return setError(v);
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
      // Step 3 — only sent for new courses
      curriculum: isNew
        ? curriculum
            .filter((s) => s.title.trim())
            .map((s) => ({
              title: s.title.trim(),
              quizId: s.quizId === NONE ? "" : s.quizId,
              assignmentId: s.assignmentId === NONE ? "" : s.assignmentId,
              units: s.units.filter((u) => u.title.trim()),
            }))
        : [],
      // Step 4
      instructors: instructors.filter((i) => i.userId),
      // Step 5
      faqQuestions: faqQuestions.filter((f) => f.title.trim()).map((f) => ({ title: f.title.trim(), answer: f.answer })),
    });
    setBusy(false);
    if ("error" in res) return setError(res.error);
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
        <div className="space-y-4 border-b bg-card px-6 pt-5 pb-4">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit course" : "Add course"}</DialogTitle>
          </DialogHeader>
          <Stepper step={step} setStep={setStep} />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <h3 className="font-heading text-base font-medium">{STEPS[step]}</h3>
            <p className="text-sm text-muted-foreground">{STEP_HINTS[step]}</p>
          </div>

          {step === 0 && (
            <StepOverview
              {...{
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
              quizzes={quizzes}
              assignments={assignments}
            />
          )}

          {step === 3 && (
            <StepInstructors authors={authors} instructors={instructors} setInstructors={setInstructors} />
          )}

          {step === 4 && <StepFaq faqQuestions={faqQuestions} setFaqQuestions={setFaqQuestions} />}

          {step === 5 && (
            <StepSubmit
              title={title}
              curriculumCount={curriculum.filter((s) => s.title.trim()).length}
              instructorCount={instructors.filter((i) => i.userId).length}
              isNew={isNew}
            />
          )}

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Sticky footer */}
        <div className="flex items-center justify-between gap-2 border-t bg-muted/40 px-6 py-3">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next</Button>
            ) : (
              <Button onClick={submit} disabled={busy}>
                {editing ? "Save changes" : "Create course"}
              </Button>
            )}
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
    <ol className="flex items-center gap-1 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const state = i === step ? "active" : i < step ? "done" : "todo";
        return (
          <li key={s} className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                state === "active"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                  state === "active"
                    ? "bg-primary text-primary-foreground"
                    : state === "done"
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {state === "done" ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{s}</span>
            </button>
            {i < STEPS.length - 1 && <span className="mx-0.5 h-px w-3 shrink-0 bg-border sm:w-5" />}
          </li>
        );
      })}
    </ol>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-border/60 bg-muted/15 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition has-[:checked]:border-primary has-[:checked]:bg-primary/5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      {label}
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
      <Group title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Course Category *" value={p.categoryId} onChange={p.setCategoryId}>
            <SelectItem value={NONE}>— Select category —</SelectItem>
            {p.categories.map((c: Opt) => <SelectItem key={c.id} value={c.id}>{optLabel(c)}</SelectItem>)}
          </SelectField>
          <div className="space-y-2">
            <Label>Course Title *</Label>
            <Input value={p.title} onChange={(e: any) => p.setTitle(e.target.value)} placeholder="Course title" />
          </div>
          <div className="space-y-2">
            <Label>Short Title *</Label>
            <Input value={p.shortTitle} onChange={(e: any) => p.setShortTitle(e.target.value)} placeholder="Card subtitle" />
          </div>
          <SelectField label="Status" value={p.status} onChange={p.setStatus}>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectField>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={p.description} onChange={(e: any) => p.setDescription(e.target.value)} rows={4} />
        </div>
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
      </Group>

      <Group title="Schedule & pricing">
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
          <div className="space-y-2">
            <Label>Maximum Students</Label>
            <Input type="number" min={0} value={p.maximumStudents} onChange={(e: any) => p.setMaximumStudents(e.target.value)} />
          </div>
        </div>
        <SelectField label="Author" value={p.authorId} onChange={p.setAuthorId}>
          <SelectItem value={NONE}>— Me —</SelectItem>
          {p.authors.map((a: Opt) => <SelectItem key={a.id} value={a.id}>{optLabel(a)}</SelectItem>)}
        </SelectField>
        <div className="grid gap-3 sm:grid-cols-3">
          <Toggle label="Free Course" checked={p.isFree} onChange={p.setIsFree} />
          <Toggle label="Auto Evaluation" checked={p.autoEvaluation} onChange={p.setAutoEvaluation} />
          <Toggle label="Unit Completion Lock" checked={p.unitCompletionLock} onChange={p.setUnitCompletionLock} />
        </div>
      </Group>

      <Group title="What students get">
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
      <Group title="Badge & certificate">
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

      <Group title="Media">
        <div className="grid gap-4 sm:grid-cols-2">
          <FileField
            label="Excellence Badge (jpg/png)"
            url={p.badgeImageUrl}
            uploading={p.uploadingBadge}
            onFile={p.onUploadBadge}
            previewClass="h-16 w-16"
          />
          <FileField
            label="Course Thumbnail (jpg/png, ~575×450, ≤1MB)"
            url={p.thumbnailUrl}
            uploading={p.uploadingThumb}
            onFile={p.onUploadThumb}
            previewClass="h-16 w-28"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Video Source" value={p.videoProvider} onChange={p.setVideoProvider}>
            <SelectItem value={NONE}>— None —</SelectItem>
            {VIDEO_PROVIDERS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectField>
          <div className="space-y-2">
            <Label>Promo Video Link</Label>
            <Input value={p.previewVideoUrl} onChange={(e: any) => p.setPreviewVideoUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>
      </Group>

      <Group title="Advanced">
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
    </div>
  );
}

function FileField({
  label, url, uploading, onFile, previewClass,
}: { label: string; url: string; uploading: boolean; onFile: (f: File) => void; previewClass: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {url && !uploading && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={url} alt="preview" className={`shrink-0 rounded-md object-cover ring-1 ring-border ${previewClass}`} />
        )}
        <div className="min-w-0 flex-1">
          <Input type="file" accept=".jpg,.jpeg,.png"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          {uploading && <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3 — Curriculum builder                                         */
/* ------------------------------------------------------------------ */

function StepCurriculum({
  isNew,
  curriculum,
  setCurriculum,
  quizzes,
  assignments,
}: {
  isNew: boolean;
  curriculum: CurriculumSection[];
  setCurriculum: (v: CurriculumSection[]) => void;
  quizzes: Opt[];
  assignments: Opt[];
}) {
  if (!isNew) {
    return (
      <p className="text-sm text-muted-foreground">
        Curriculum (sections, units, quizzes, assignments) is managed from the Section and Unit
        managers after creation, so existing content and student progress are preserved.
      </p>
    );
  }

  function update(i: number, patch: Partial<CurriculumSection>) {
    setCurriculum(curriculum.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= curriculum.length) return;
    const next = [...curriculum];
    [next[i], next[j]] = [next[j], next[i]];
    setCurriculum(next);
  }

  return (
    <div className="space-y-4">
      {curriculum.map((section, i) => (
        <div key={i} className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">#{i + 1}</Badge>
            <Input
              value={section.title}
              placeholder="Section title"
              onChange={(e) => update(i, { title: e.target.value })}
            />
            <Button variant="ghost" size="icon" onClick={() => move(i, -1)} aria-label="Move up"><ChevronUp className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => move(i, 1)} aria-label="Move down"><ChevronDown className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setCurriculum(curriculum.filter((_, idx) => idx !== i))} aria-label="Delete section">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Attach quiz" value={section.quizId || NONE} onChange={(v) => update(i, { quizId: v })}>
              <SelectItem value={NONE}>None</SelectItem>
              {quizzes.map((q) => <SelectItem key={q.id} value={q.id}>{optLabel(q)}</SelectItem>)}
            </SelectField>
            <SelectField label="Attach assignment" value={section.assignmentId || NONE} onChange={(v) => update(i, { assignmentId: v })}>
              <SelectItem value={NONE}>None</SelectItem>
              {assignments.map((a) => <SelectItem key={a.id} value={a.id}>{optLabel(a)}</SelectItem>)}
            </SelectField>
          </div>

          {/* Units */}
          <div className="space-y-2">
            <Label>Units</Label>
            {section.units.map((unit, ui) => (
              <div key={ui} className="grid items-start gap-2 rounded-md border border-border/70 p-2 sm:grid-cols-[1fr_140px_auto]">
                <Input value={unit.title} placeholder="Unit title"
                  onChange={(e) => update(i, { units: section.units.map((u, idx) => idx === ui ? { ...u, title: e.target.value } : u) })} />
                <Select value={unit.type}
                  onValueChange={(v) => update(i, { units: section.units.map((u, idx) => idx === ui ? { ...u, type: v ?? "VIDEO" } : u) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNIT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Toggle label="Free" checked={unit.isFree}
                    onChange={(v) => update(i, { units: section.units.map((u, idx) => idx === ui ? { ...u, isFree: v } : u) })} />
                  <Button variant="ghost" size="icon" aria-label="Remove unit"
                    onClick={() => update(i, { units: section.units.filter((_, idx) => idx !== ui) })}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input className="sm:col-span-3" value={unit.publicVideoUrl} placeholder="Video / content URL (optional)"
                  onChange={(e) => update(i, { units: section.units.map((u, idx) => idx === ui ? { ...u, publicVideoUrl: e.target.value } : u) })} />
              </div>
            ))}
            <Button variant="outline" size="sm"
              onClick={() => update(i, { units: [...section.units, { title: "", type: "VIDEO", description: "", isFree: false, publicVideoUrl: "", storageVideoUrl: "" }] })}>
              <Plus className="mr-1 h-4 w-4" /> Add unit
            </Button>
          </div>
        </div>
      ))}

      <Button variant="outline"
        onClick={() => setCurriculum([...curriculum, { title: "", quizId: "", assignmentId: "", units: [] }])}>
        <Plus className="mr-1 h-4 w-4" /> Add section
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 4 — Instructors                                                */
/* ------------------------------------------------------------------ */

function StepInstructors({
  authors,
  instructors,
  setInstructors,
}: {
  authors: Opt[];
  instructors: CourseInstructor[];
  setInstructors: (v: CourseInstructor[]) => void;
}) {
  function update(i: number, patch: Partial<CourseInstructor>) {
    setInstructors(instructors.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  return (
    <div className="space-y-3">
      {instructors.map((ins, i) => (
        <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_200px_auto]">
          <SelectField label="Instructor *" value={ins.userId || NONE} onChange={(v) => update(i, { userId: v === NONE ? "" : v })}>
            <SelectItem value={NONE}>— Select —</SelectItem>
            {authors.map((a) => <SelectItem key={a.id} value={a.id}>{optLabel(a)}</SelectItem>)}
          </SelectField>
          <SelectField label="Category" value={ins.category} onChange={(v) => update(i, { category: v })}>
            {INSTRUCTOR_ROLES.map((r) => <SelectItem key={r} value={r}>{r === "LEAD" ? "Lead instructor" : "Support instructor"}</SelectItem>)}
          </SelectField>
          <Button variant="ghost" size="icon" aria-label="Remove"
            onClick={() => setInstructors(instructors.filter((_, idx) => idx !== i))}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setInstructors([...instructors, { userId: "", category: "LEAD" }])}>
        <Plus className="mr-1 h-4 w-4" /> Add instructor
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 5 — FAQ                                                        */
/* ------------------------------------------------------------------ */

function StepFaq({ faqQuestions, setFaqQuestions }: { faqQuestions: Qa[]; setFaqQuestions: (v: Qa[]) => void }) {
  return <RepeatableQa label="FAQ" items={faqQuestions} setItems={setFaqQuestions} allowEmpty />;
}

/* ------------------------------------------------------------------ */
/* Step 6 — Submit                                                     */
/* ------------------------------------------------------------------ */

function StepSubmit({ title, curriculumCount, instructorCount, isNew }: {
  title: string; curriculumCount: number; instructorCount: number; isNew: boolean;
}) {
  return (
    <div className="space-y-2 text-sm">
      <p>Review your course and submit.</p>
      <ul className="list-inside list-disc text-muted-foreground">
        <li>Title: <span className="text-foreground">{title || "—"}</span></li>
        {isNew && <li>Curriculum sections: <span className="text-foreground">{curriculumCount}</span></li>}
        <li>Instructors: <span className="text-foreground">{instructorCount}</span></li>
      </ul>
      <p className="text-muted-foreground">Required fields are validated on submit; you&apos;ll be told which step to fix.</p>
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
