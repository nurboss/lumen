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

export interface CertLayout {
  title?: string;
  body?: string;
  signatureName?: string;
  signatureTitle?: string;
  accentColor?: string;
}

export interface CertTemplate {
  id: string;
  name: string;
  assetUrl: string | null;
  layout: CertLayout | null;
  courseCount: number;
  issuedCount: number;
}

const DEFAULT_LAYOUT: Required<CertLayout> = {
  title: "Certificate of Completion",
  body: "This is to certify that {name} has successfully completed {course}.",
  signatureName: "",
  signatureTitle: "",
  accentColor: "#4f46e5",
};

export function CertificateManager({ templates }: { templates: CertTemplate[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CertTemplate | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(t: CertTemplate) {
    const warn =
      t.courseCount > 0
        ? `This template is linked to ${t.courseCount} course(s); they will be unlinked. `
        : "";
    if (!confirm(`${warn}Delete "${t.name}"?`)) return;
    setBusy(true);
    const res = await postJson("/api/admin/certificate", { action: "delete", id: t.id });
    setBusy(false);
    if (!("error" in res)) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> New certificate
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Linked courses</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {t.layout?.title ?? DEFAULT_LAYOUT.title}
                </TableCell>
                <TableCell>
                  {t.courseCount > 0 ? <Badge variant="secondary">{t.courseCount}</Badge> : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {t.issuedCount > 0 ? <Badge variant="outline">{t.issuedCount}</Badge> : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setOpen(true); }} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={busy} onClick={() => remove(t)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No certificate templates yet. Create one, then link it to a course in the course editor.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {open && (
        <CertificateDialog
          key={editing?.id ?? "new"}
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          onSaved={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function CertificateDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: CertTemplate | null;
  onSaved: () => void;
}) {
  const l = { ...DEFAULT_LAYOUT, ...(editing?.layout ?? {}) };
  const [name, setName] = useState(editing?.name ?? "");
  const [assetUrl, setAssetUrl] = useState(editing?.assetUrl ?? "");
  const [title, setTitle] = useState(l.title);
  const [body, setBody] = useState(l.body);
  const [signatureName, setSignatureName] = useState(l.signatureName);
  const [signatureTitle, setSignatureTitle] = useState(l.signatureTitle);
  const [accentColor, setAccentColor] = useState(l.accentColor || "#4f46e5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!name.trim()) return setError("Enter a template name.");
    setBusy(true);
    const res = await postJson("/api/admin/certificate", {
      action: editing ? "update" : "create",
      ...(editing ? { id: editing.id } : {}),
      name: name.trim(),
      assetUrl: assetUrl.trim(),
      layout: {
        title: title.trim() || DEFAULT_LAYOUT.title,
        body: body.trim() || DEFAULT_LAYOUT.body,
        signatureName: signatureName.trim(),
        signatureTitle: signatureTitle.trim(),
        accentColor: accentColor.trim() || "#4f46e5",
      },
    });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit certificate" : "New certificate"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Default completion certificate" />
          </div>

          <div className="space-y-2">
            <Label>Heading</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Body text</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
            <p className="text-xs text-muted-foreground">
              Placeholders: <code>{"{name}"}</code> <code>{"{course}"}</code> <code>{"{code}"}</code> <code>{"{region}"}</code> <code>{"{date}"}</code>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Signature name</Label>
              <Input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="e.g. Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label>Signature title</Label>
              <Input value={signatureTitle} onChange={(e) => setSignatureTitle(e.target.value)} placeholder="e.g. Director" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Accent color</Label>
              <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 p-1" />
            </div>
            <div className="space-y-2">
              <Label>Background image URL (optional)</Label>
              <Input value={assetUrl} onChange={(e) => setAssetUrl(e.target.value)} placeholder="https://…" />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={save} disabled={busy}>{editing ? "Save changes" : "Create certificate"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
