"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const { data } = await res.json();
    setItems(data.items);
    setUnread(data.unread);
  }, []);

  // Subscribe to the SSE unread-count stream.
  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");
    es.addEventListener("unread", (e) => {
      try {
        const { unread } = JSON.parse((e as MessageEvent).data);
        setUnread(unread);
      } catch {
        /* ignore */
      }
    });
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  async function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      await load();
      // Mark all read on open.
      await fetch("/api/notifications/read", { method: "POST", body: "{}" });
      setUnread(0);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative" aria-label="Notifications" />}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="font-heading text-sm font-semibold">Notifications</p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications.</p>
          ) : (
            items.map((n) => {
              const content = (
                <div className={cn("border-b border-border px-4 py-3 last:border-0", !n.read && "bg-secondary/40")}>
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                </div>
              );
              return n.link ? (
                <a key={n.id} href={n.link} className="block hover:bg-secondary/60">
                  {content}
                </a>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
