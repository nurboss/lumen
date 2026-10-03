"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/client-api";

export function EnrollButton({ courseId, batchId, enrolled, isAuthed, unavailable }: {
  courseId: string;
  batchId?: string;
  enrolled: boolean;
  isAuthed: boolean;
  unavailable?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    if (!isAuthed) {
      const destination = `/courseDetails/${courseId}${batchId ? `?batch=${encodeURIComponent(batchId)}` : ""}`;
      router.push(`/login?next=${encodeURIComponent(destination)}`);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await postJson("/api/course/enroll/add", { courseId, ...(batchId ? { batchId } : {}) });
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push(batchId ? "/student/my-batch" : `/student/my-course/${courseId}`);
    router.refresh();
  }

  if (enrolled) {
    return (
      <Button className="w-full" onClick={() => router.push(batchId ? "/student/my-batch" : `/student/my-course/${courseId}`)}>
        {batchId ? "View my batch" : "Go to course"}
      </Button>
    );
  }

  return (
    <div>
      <Button className="w-full" onClick={enroll} disabled={loading || Boolean(unavailable)}>
        {loading ? "Enrolling…" : unavailable ?? (batchId ? "Enroll in batch" : "Enroll now")}
      </Button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
