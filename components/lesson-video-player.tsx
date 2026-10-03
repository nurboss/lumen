"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import ReactPlayer from "react-player";
import { AlertCircle, LoaderCircle, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const PLAYER_CONFIG = { youtube: { disablekb: 1 as const, fs: 0 as const, rel: 0 as const, iv_load_policy: 3 as const } };

function subscribeFullscreen(callback: () => void) {
  document.addEventListener("fullscreenchange", callback);
  return () => document.removeEventListener("fullscreenchange", callback);
}

const supportsFullscreen = () => Boolean(document.fullscreenEnabled);
const serverFullscreen = () => false;

function timeLabel(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainder = String(value % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}` : `${minutes}:${remainder}`;
}

type Props = {
  src: string;
  title: string;
  resumeAt: number;
  speed: number;
  onSpeedChange: (speed: number) => void;
  onProgress: (position: number, duration: number, saveImmediately?: boolean) => void;
  onEnded: () => void;
};

export function LessonVideoPlayer({ src, title, resumeAt, speed, onSpeedChange, onProgress, onEnded }: Props) {
  const mediaRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resumedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fullscreenAvailable = useSyncExternalStore(subscribeFullscreen, supportsFullscreen, serverFullscreen);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  function updateDuration(media: HTMLVideoElement) {
    const length = Number.isFinite(media.duration) ? media.duration : 0;
    setDuration(length);
    return length;
  }

  function updateProgress(media: HTMLVideoElement, saveImmediately = false) {
    const current = Number.isFinite(media.currentTime) ? media.currentTime : 0;
    setPosition(current);
    onProgress(current, updateDuration(media), saveImmediately);
  }

  function seek(to: number) {
    const media = mediaRef.current;
    if (!media || !ready || duration <= 0) return;
    const next = Math.max(0, Math.min(duration, to));
    media.currentTime = next;
    setPosition(next);
    onProgress(next, duration, true);
  }

  function togglePlayback() {
    const media = mediaRef.current;
    if (!media || !ready || error) return;
    if (playing) {
      media.pause();
      setPlaying(false);
    } else {
      if (media.ended) seek(0);
      setPlaying(true);
      // Invoke play in the user gesture so browsers allow audio playback.
      void media.play().catch(() => {
        setPlaying(false);
        setBuffering(false);
      });
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === containerRef.current) await document.exitFullscreen();
      else await containerRef.current?.requestFullscreen();
    } catch {
      // Some browsers disallow fullscreen even when the API is available.
    }
  }

  function toggleMute() {
    if (muted || volume === 0) {
      setVolume(volume || 0.8);
      setMuted(false);
    } else {
      setMuted(true);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("input, select, textarea, a") || event.altKey || event.ctrlKey || event.metaKey) return;
    // Space should still activate whichever toolbar button has focus.
    if (event.key === " " && target.closest("button")) return;
    switch (event.key.toLowerCase()) {
      case " ":
      case "k": togglePlayback(); break;
      case "arrowleft": seek(position - 10); break;
      case "arrowright": seek(position + 10); break;
      case "m": toggleMute(); break;
      case "f": if (fullscreenAvailable) void toggleFullscreen(); break;
      default: return;
    }
    event.preventDefault();
  }

  const playedPercent = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;
  const disabled = !ready || Boolean(error);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`${title} video player`}
      aria-keyshortcuts="Space K ArrowLeft ArrowRight M F"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-black outline-none focus-visible:ring-2 focus-visible:ring-ring fullscreen:h-screen fullscreen:w-screen fullscreen:rounded-none"
    >
      <div className={cn("relative min-h-0 w-full", fullscreen ? "flex-1" : "aspect-video")}>
        <ReactPlayer
          ref={mediaRef}
          src={src}
          controls={false}
          playsInline
          playing={playing}
          playbackRate={speed}
          volume={volume}
          muted={muted}
          config={PLAYER_CONFIG}
          width="100%"
          height="100%"
          style={{ objectFit: "contain" }}
          fallback={<div className="flex h-full items-center justify-center text-white"><LoaderCircle className="size-7 animate-spin" aria-label="Loading video" /></div>}
          onLoadedMetadata={(event) => {
            const media = event.currentTarget;
            const length = updateDuration(media);
            if (!resumedRef.current) {
              resumedRef.current = true;
              if (resumeAt > 0 && length > 0) media.currentTime = Math.min(resumeAt, Math.max(0, length - 1));
            }
            setPosition(Number.isFinite(media.currentTime) ? media.currentTime : 0);
            setReady(true);
          }}
          onDurationChange={(event) => updateDuration(event.currentTarget)}
          onTimeUpdate={(event) => updateProgress(event.currentTarget)}
          onProgress={(event) => {
            const ranges = event.currentTarget.buffered;
            if (ranges.length) setBuffered(ranges.end(ranges.length - 1));
          }}
          onPlay={() => setPlaying(true)}
          onPlaying={() => { setPlaying(true); setBuffering(false); }}
          onPause={(event) => { setPlaying(false); setBuffering(false); updateProgress(event.currentTarget, true); }}
          onWaiting={() => setBuffering(true)}
          onCanPlay={() => setBuffering(false)}
          onSeeked={(event) => { setBuffering(false); updateProgress(event.currentTarget); }}
          onEnded={() => { setPlaying(false); setBuffering(false); onEnded(); }}
          onRateChange={(event) => onSpeedChange(event.currentTarget.playbackRate)}
          onError={() => { setPlaying(false); setBuffering(false); setError("This video couldn't be loaded. Refresh the page or try again later."); }}
        />

        {!error && (
          <button
            type="button"
            aria-label={playing ? "Pause video" : "Play video"}
            disabled={disabled}
            onClick={togglePlayback}
            className="absolute inset-0 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            {(!ready || buffering) ? (
              <span className="flex size-16 items-center justify-center rounded-full bg-black/60 text-white"><LoaderCircle className="size-7 animate-spin" /><span className="sr-only">Loading video</span></span>
            ) : !playing ? (
              <span className="flex size-16 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg backdrop-blur-sm transition-transform hover:scale-105 sm:size-20"><Play className="size-7 fill-current sm:size-8" /></span>
            ) : null}
          </button>
        )}

        {error && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center text-sm text-white">
            <AlertCircle className="size-8 text-destructive" />
            <p className="max-w-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-card px-3 pb-2 pt-3 text-foreground sm:px-4">
        <div className="relative flex h-4 items-center">
          <div className="pointer-events-none absolute inset-x-0 h-1 overflow-hidden rounded-full bg-muted">
            <div className="absolute inset-y-0 left-0 bg-foreground/20" style={{ width: `${bufferedPercent}%` }} />
            <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${playedPercent}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={Math.min(position, duration || 1)}
            disabled={disabled || !duration}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Seek video"
            aria-valuetext={`${timeLabel(position)} of ${timeLabel(duration)}`}
            className="lesson-seek relative m-0 h-4 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed"
          />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-2 sm:gap-x-2">
          <Control label={playing ? "Pause (Space)" : "Play (Space)"} onClick={togglePlayback} disabled={disabled}>{playing ? <Pause /> : <Play />}</Control>
          <Control label="Back 10 seconds" onClick={() => seek(position - 10)} disabled={disabled || !duration}><RotateCcw /><span className="hidden text-[10px] sm:inline">10</span></Control>
          <Control label="Forward 10 seconds" onClick={() => seek(position + 10)} disabled={disabled || !duration}><RotateCw /><span className="hidden text-[10px] sm:inline">10</span></Control>
          <span className="ml-1 whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">{timeLabel(position)} <span className="opacity-50">/</span> {timeLabel(duration)}</span>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Control label={muted || volume === 0 ? "Unmute (M)" : "Mute (M)"} onClick={toggleMute} disabled={disabled}>{muted || volume === 0 ? <VolumeX /> : <Volume2 />}</Control>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(event) => { setVolume(Number(event.target.value)); setMuted(false); }} aria-label="Volume" disabled={disabled} className="hidden h-1 w-16 cursor-pointer accent-primary sm:block" />
            <select aria-label="Playback speed" value={speed} onChange={(event) => onSpeedChange(Number(event.target.value))} disabled={disabled} className="h-9 rounded-md border border-border bg-secondary px-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-2">
              {SPEEDS.map((value) => <option key={value} value={value}>{value}×</option>)}
            </select>
            {fullscreenAvailable && <Control label={fullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"} onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize /> : <Maximize />}</Control>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Control({ label, children, onClick, disabled }: { label: string; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 min-w-9 items-center justify-center gap-1 rounded-md px-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
