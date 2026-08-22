"use client";

import { useEffect, useState } from "react";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const totalSeconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

const ZERO = { days: 0, hours: 0, minutes: 0, seconds: 0 };

export function Countdown({ endsAt }: { endsAt: string }) {
  const target = new Date(endsAt).getTime();
  const [t, setT] = useState(ZERO);

  useEffect(() => {
    setT(diff(target));
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const units = [
    { label: "Days", value: t.days },
    { label: "Hrs", value: t.hours },
    { label: "Min", value: t.minutes },
    { label: "Sec", value: t.seconds },
  ];

  return (
    <div className="flex gap-2">
      {units.map((u) => (
        <div
          key={u.label}
          className="flex min-w-14 flex-col items-center rounded-lg bg-accent px-3 py-2 text-accent-foreground"
        >
          <span className="font-heading text-xl font-bold tabular-nums">
            {String(u.value).padStart(2, "0")}
          </span>
          <span className="text-[0.65rem] uppercase tracking-wide">{u.label}</span>
        </div>
      ))}
    </div>
  );
}
