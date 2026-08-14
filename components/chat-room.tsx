"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { postJson } from "@/lib/client-api";

interface Message {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  createdAt: string;
}

export function ChatRoom({ roomKey, currentUserId }: { roomKey: string; currentUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/chat/${encodeURIComponent(roomKey)}`);
    if (!res.ok) return;
    const { data } = await res.json();
    setMessages(data.messages);
  }, [roomKey]);

  useEffect(() => {
    // Poll the chat history endpoint as an external subscription.
    let active = true;
    const poll = () => {
      if (active) void load();
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    const res = await postJson<{ message: Message }>("/api/chat/send", { roomKey, body: text.trim() });
    setBusy(false);
    if ("data" in res) {
      setMessages((m) => [...m, res.data.message]);
      setText("");
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border border-border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Say hello!</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                    mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {!mine && <p className="mb-0.5 text-xs font-semibold opacity-70">{m.senderName}</p>}
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message…"
        />
        <Button onClick={send} disabled={busy} size="icon" aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
