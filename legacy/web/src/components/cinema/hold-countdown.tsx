"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

export const HoldCountdown = ({
  expiresAt,
  onExpired,
}: {
  expiresAt: number | null;
  onExpired?: () => void;
}) => {
  const [remaining, setRemaining] = useState(() =>
    expiresAt ? Math.max(0, expiresAt - Date.now()) : 0,
  );
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const tick = () => {
      const diff = Math.max(0, expiresAt - Date.now());
      setRemaining(diff);
      if (diff <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpired?.();
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt, onExpired]);

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
