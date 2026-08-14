"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveRoom } from "@/components/live-room";

export function JoinLive({ unitId, displayName }: { unitId: string; displayName: string }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/live/join/${unitId}`);
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json?.error ?? "Could not join.");
    setRoomId(json.data.roomId);
  }

  if (roomId) {
    return <LiveRoom roomId={roomId} displayName={displayName} onLeave={() => setRoomId(null)} />;
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={join} disabled={busy}>
        <Video className="mr-2 h-4 w-4" /> Join live class
      </Button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
