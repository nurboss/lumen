"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCheck, Paperclip } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/client-api";

export interface RunnerAssignment {
  id: string;
  title: string;
  description: string | null;
  submissionType: string; // TEXT_AREA | FILE | BOTH
  maximumMarks: number;
}

/**
 * Inline assignment submission, shown in the player stage right after its
 * preceding quiz/video. On success the player unlocks the Next control.
 */
export function AssignmentRunner({
  assignment,
  alreadyCompleted = false,
  onCompleted,
}: {
  assignment: RunnerAssignment;
  alreadyCompleted?: boolean;
  onCompleted?: () => void;
}) {
  const [contentText, setContentText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const wantsText = assignment.submissionType === "TEXT_AREA" || assignment.submissionType === "BOTH";
  const wantsFile = assignment.submissionType === "FILE" || assignment.submissionType === "BOTH";

  async function submit() {
    setError(null);
    if (wantsText && !contentText.trim() && !fileUrl.trim()) {
      return setError("Add your response before submitting.");
    }
    if (assignment.submissionType === "FILE" && !fileUrl.trim()) {
      return setError("Add a file link before submitting.");
    }
    setLoading(true);
    const res = await postJson<{ submissionId: string }>("/api/assignment_result/add", {
      assignmentId: assignment.id,
      contentText: contentText.trim() || undefined,
      fileUrl: fileUrl.trim() || undefined,
    });
    setLoading(false);
    if ("error" in res) return setError(res.error);
    setSubmitted(true);
    onCompleted?.();
  }

  if (submitted || alreadyCompleted) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
          <h2 className="mt-4 font-heading text-2xl font-bold text-foreground">
            {submitted ? "Assignment submitted" : "Already submitted"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            Your instructor will review it and post marks. Continue when you&apos;re ready.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          <span>Worth {assignment.maximumMarks} marks</span>
        </div>

        {assignment.description && (
          <div
            className="prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: assignment.description }}
          />
        )}

        {wantsText && (
          <div className="space-y-2">
            <Label htmlFor="assignment-text">Your response</Label>
            <Textarea
              id="assignment-text"
              rows={7}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder="Write your answer here…"
            />
          </div>
        )}

        {wantsFile && (
          <div className="space-y-2">
            <Label htmlFor="assignment-file" className="flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" /> File link
            </Label>
            <Input
              id="assignment-file"
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://drive.google.com/…"
            />
            <p className="text-xs text-muted-foreground">Paste a shareable link to your uploaded file.</p>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={submit} disabled={loading} className="w-full sm:w-auto">
          {loading ? "Submitting…" : "Submit assignment"}
        </Button>
      </CardContent>
    </Card>
  );
}
