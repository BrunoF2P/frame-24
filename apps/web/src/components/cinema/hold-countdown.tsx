"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";

export const HoldCountdown = ({ expiresAt }: { expiresAt: number | null }) => {
  const [remaining, setRemaining] = useState(() =>
    expiresAt ? Math.max(0, expiresAt - Date.now()) : 0,
  );

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const tick = () => {
      setRemaining(Math.max(0, expiresAt - Date.now()));
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  const label = useMemo(() => {
    const totalSeconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [remaining]);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-accent-red-500/20 bg-accent-red-500/8 px-4 py-2 text-sm text-accent-red-300">
      <Icon name="timer" size="sm" />
      Reserva temporária: {label}
    </div>
  );
};
