"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/client-api";

export function EnrollButton({
  courseId,
  enrolled,
  isAuthed,
}: {
  courseId: string;
  enrolled: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (enrolled) {
    return (
      <Button className="w-full" onClick={() => router.push(`/student/my-course/${courseId}`)}>
        Go to course
      </Button>
    );
  }

  async function enroll() {
    if (!isAuthed) {
      router.push(`/login?next=/courseDetails/${courseId}`);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await postJson("/api/course/enroll/add", { courseId });
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push(`/student/my-course/${courseId}`);
    router.refresh();
  }

  return (
    <div>
      <Button className="w-full" onClick={enroll} disabled={loading}>
        {loading ? "Enrolling…" : "Enroll now"}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
