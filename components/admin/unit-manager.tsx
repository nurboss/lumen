"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Video, Radio, FileText } from "lucide-react";
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

type UType = "VIDEO" | "LIVE" | "TEXT";
type Unit = "SECOND" | "MINUTE" | "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";

interface UnitRow {
  id: string;
  sectionId: string;
  title: string;
  description: string | null;
  order: number;
  type: UType;
  code: string | null;
  isFree: boolean;
  duration: number | null;
  durationUnit: Unit | null;
  publicVideoUrl: string | null;
  storageVideoUrl: string | null;
  attachmentUrl: string | null;
  startDate: string | null;
  startTime: string | null;
  section: {
    title: string;
    course: { title: string } | null;
    batch: { name: string | null; course: { title: string } } | null;
  };
}

interface Opt { id: string; label: string; }

const UNITS: Unit[] = ["SECOND", "MINUTE", "HOUR", "DAY", "WEEK", "MONTH", "YEAR"];
const TYPE_ICON = { VIDEO: Video, LIVE: Radio, TEXT: FileText } as const;

function toDateInput(iso: string | null) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

export function UnitManager({ units, sections }: { units: UnitRow[]; sections: Opt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UnitRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(id: string) {
    if (!confirm("Delete this unit?")) return;
    setBusy(true);
    const res = await postJson("/api/admin/unit", { action: "delete", id });
    setBusy(false);
    if (!("error" in res)) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }} disabled={sections.length === 0}>
          <Plus className="mr-1 h-4 w-4" /> New unit
        </Button>
      </div>
      {sections.length === 0 && <p className="text-sm text-muted-foreground">Create a section first.</p>}

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Free</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((u) => {
              const Icon = TYPE_ICON[u.type];
              const parent = u.section.course
                ? u.section.course.title
                : u.section.batch
                  ? `${u.section.batch.course.title} — ${u.section.batch.name ?? "Batch"}`
                  : "Unassigned";
              return (
                <TableRow key={u.id}>
                  <TableCell><Badge variant="outline">#{u.order}</Badge></TableCell>
                  <TableCell className="font-medium">{u.title}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {u.type[0] + u.type.slice(1).toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{parent} › {u.section.title}</TableCell>
                  <TableCell>{u.isFree ? <Badge>Free</Badge> : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(u); setOpen(true); }} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={busy} onClick={() => remove(u.id)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {units.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No units yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {open && (
        <UnitDialog
          key={editing?.id ?? "new"}
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          sections={sections}
          onSaved={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function UnitDialog({
  open,
  onOpenChange,
  editing,
  sections,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: UnitRow | null;
  sections: Opt[];
  onSaved: () => void;
}) {
  const [sectionId, setSectionId] = useState(editing?.sectionId ?? sections[0]?.id ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [order, setOrder] = useState(editing?.order?.toString() ?? "0");
  const [type, setType] = useState<UType>(editing?.type ?? "VIDEO");
  const [code, setCode] = useState(editing?.code ?? "");
  const [isFree, setIsFree] = useState(editing?.isFree ?? false);
  const [duration, setDuration] = useState(editing?.duration?.toString() ?? "");
  const [durationUnit, setDurationUnit] = useState<Unit>(editing?.durationUnit ?? "MINUTE");
  const [publicVideoUrl, setPublicVideoUrl] = useState(editing?.publicVideoUrl ?? "");
  const [storageVideoUrl, setStorageVideoUrl] = useState(editing?.storageVideoUrl ?? "");
  const [attachmentUrl, setAttachmentUrl] = useState(editing?.attachmentUrl ?? "");
  const [startDate, setStartDate] = useState(toDateInput(editing?.startDate ?? null));
  const [startTime, setStartTime] = useState(editing?.startTime ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!sectionId) return setError("Choose a section.");
    if (!title.trim()) return setError("Enter a title.");
    setBusy(true);
    const res = await postJson("/api/admin/unit", {
      action: editing ? "update" : "create",
      ...(editing ? { id: editing.id } : {}),
      sectionId,
      title: title.trim(),
      description: description.trim(),
      order: Number(order) || 0,
      type,
      code: code.trim(),
      isFree,
      duration: duration ? Number(duration) : undefined,
      durationUnit,
      publicVideoUrl: publicVideoUrl.trim(),
      storageVideoUrl: storageVideoUrl.trim(),
      attachmentUrl: attachmentUrl.trim(),
      startDate,
      startTime: startTime.trim(),
    });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit unit" : "New unit"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Section</Label>
            <Select value={sectionId} onValueChange={(v) => setSectionId(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as UType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="LIVE">Live class</SelectItem>
                  <SelectItem value="TEXT">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
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

          {type === "VIDEO" && (
            <>
              <div className="space-y-2">
                <Label>Public video URL (YouTube/preview)</Label>
                <Input value={publicVideoUrl} onChange={(e) => setPublicVideoUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Storage video URL (Drive/Vimeo/upload)</Label>
                <Input value={storageVideoUrl} onChange={(e) => setStorageVideoUrl(e.target.value)} />
              </div>
            </>
          )}

          {type === "LIVE" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Start time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Attachment URL</Label>
            <Input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} className="h-4 w-4" />
            Free preview (accessible without enrollment)
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={save} disabled={busy}>{editing ? "Save changes" : "Create unit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
