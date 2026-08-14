"use client";

import { useState } from "react";
import { Video, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveRoom } from "@/components/live-room";
import { postJson } from "@/lib/client-api";

export function HostControls({
  unitId,
  hostName,
  initialStatus,
}: {
  unitId: string;
  hostName: string;
  initialStatus: string;
}) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    const res = await postJson<{ roomId: string }>("/api/live/start", { unitId });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    setRoomId(res.data.roomId);
    setStatus("STARTED");
  }

  async function stop() {
    setBusy(true);
    await postJson("/api/live/stop", { unitId });
    setBusy(false);
    setRoomId(null);
    setStatus("ENDED");
  }

  if (roomId) {
    return (
      <div className="space-y-3">
        <LiveRoom roomId={roomId} displayName={hostName} onLeave={stop} />
        <Button variant="destructive" onClick={stop} disabled={busy}>
          <Square className="mr-2 h-4 w-4" /> End class
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={start} disabled={busy}>
        <Video className="mr-2 h-4 w-4" /> Start live class
      </Button>
      <span className="text-xs text-muted-foreground">Status: {status}</span>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
