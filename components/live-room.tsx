"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const SIGNAL_URL = process.env.NEXT_PUBLIC_SIGNAL_URL ?? "ws://localhost:3001";
const ICE: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

interface RemotePeer {
  peerId: string;
  name: string;
  stream: MediaStream;
}

export function LiveRoom({
  roomId,
  displayName,
  onLeave,
}: {
  roomId: string;
  displayName: string;
  onLeave?: () => void;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peerIdRef = useRef<string>("");
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [status, setStatus] = useState("Connecting…");

  const upsertRemote = useCallback((peerId: string, name: string, stream: MediaStream) => {
    setRemotePeers((prev) => {
      const others = prev.filter((p) => p.peerId !== peerId);
      return [...others, { peerId, name, stream }];
    });
  }, []);

  const removeRemote = useCallback((peerId: string) => {
    setRemotePeers((prev) => prev.filter((p) => p.peerId !== peerId));
    const pc = pcsRef.current.get(peerId);
    pc?.close();
    pcsRef.current.delete(peerId);
  }, []);

  const createPc = useCallback(
    (remoteId: string, remoteName: string) => {
      const pc = new RTCPeerConnection(ICE);
      pcsRef.current.set(remoteId, pc);

      localStreamRef.current?.getTracks().forEach((t) => {
        pc.addTrack(t, localStreamRef.current!);
      });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          wsRef.current?.send(
            JSON.stringify({ type: "signal", to: remoteId, data: { candidate: e.candidate } })
          );
        }
      };
      pc.ontrack = (e) => {
        upsertRemote(remoteId, remoteName, e.streams[0]);
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          removeRemote(remoteId);
        }
      };
      return pc;
    },
    [upsertRemote, removeRemote]
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!peerIdRef.current) peerIdRef.current = crypto.randomUUID();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch {
        setStatus("Could not access camera/microphone.");
        return;
      }

      const ws = new WebSocket(SIGNAL_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("Connected");
        ws.send(JSON.stringify({ type: "join", room: roomId, peerId: peerIdRef.current, name: displayName }));
      };
      ws.onerror = () => setStatus("Signaling connection failed.");
      ws.onclose = () => setStatus("Disconnected");

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === "peers") {
          // We are the newcomer → initiate an offer to each existing peer.
          for (const p of msg.peers as { peerId: string; name: string }[]) {
            const pc = createPc(p.peerId, p.name);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: "signal", to: p.peerId, data: { sdp: pc.localDescription } }));
          }
        } else if (msg.type === "peer-joined") {
          // Existing peer waits for the newcomer's offer; nothing to do yet.
        } else if (msg.type === "peer-left") {
          removeRemote(msg.peerId);
        } else if (msg.type === "signal") {
          const from: string = msg.from;
          let pc = pcsRef.current.get(from);
          if (!pc) pc = createPc(from, "Guest");

          if (msg.data.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.data.sdp));
            if (msg.data.sdp.type === "offer") {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              ws.send(JSON.stringify({ type: "signal", to: from, data: { sdp: pc.localDescription } }));
            }
          } else if (msg.data.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(msg.data.candidate));
            } catch {
              /* ignore late candidates */
            }
          }
        }
      };
    }

    init();

    const pcs = pcsRef.current;
    return () => {
      cancelled = true;
      wsRef.current?.send?.(JSON.stringify({ type: "leave" }));
      wsRef.current?.close();
      pcs.forEach((pc) => pc.close());
      pcs.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomId, displayName, createPc, removeRemote]);

  function toggleMic() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  }
  function toggleCam() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{status}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-xl border border-border bg-black">
          <video ref={localVideoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
          <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
            {displayName} (you)
          </span>
        </div>
        {remotePeers.map((p) => (
          <RemoteTile key={p.peerId} peer={p} />
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <Button variant={micOn ? "outline" : "destructive"} size="icon" onClick={toggleMic} aria-label="Toggle mic">
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        <Button variant={camOn ? "outline" : "destructive"} size="icon" onClick={toggleCam} aria-label="Toggle camera">
          {camOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
        <Button variant="destructive" onClick={onLeave}>
          <PhoneOff className="mr-2 h-4 w-4" /> Leave
        </Button>
      </div>
    </div>
  );
}

function RemoteTile({ peer }: { peer: RemotePeer }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = peer.stream;
  }, [peer.stream]);
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-black">
      <video ref={ref} autoPlay playsInline className="aspect-video w-full object-cover" />
      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {peer.name}
      </span>
    </div>
  );
}
