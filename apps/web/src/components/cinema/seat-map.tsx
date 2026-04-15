"use client";

import { useMemo, useState } from "react";
import { useReducedMotion, motion } from "framer-motion";
import type { SeatNode } from "@/types/storefront";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/stores/use-booking-store";
import { Icon } from "@/components/ui/icon";

const seatStatusTone: Record<SeatNode["status"], string> = {
  available: "bg-foreground/12 hover:bg-accent-red-400 hover:text-white",
  selected: "bg-accent-red-500 text-white",
  held: "bg-warning/80 text-black font-bold cursor-not-allowed shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]",
  sold: "bg-white/6 text-white/35 cursor-not-allowed",
};

const seatKindTone: Partial<Record<SeatNode["seatKind"], string>> = {
  wheelchair: "ring-1 ring-success/50",
  companion: "ring-1 ring-accent-red-300/50",
  reduced_mobility: "ring-1 ring-success/35",
  guide_dog: "ring-1 ring-gold-300/40",
  premium_motion: "bg-gold-300/28 text-gold-100 hover:bg-gold-300/38",
  couple_left: "bg-accent-red-500/22 text-white/90",
  couple_right: "bg-accent-red-500/22 text-white/90",
  obese: "ring-1 ring-warning/50",
  vip_recliner: "bg-gold-300/20 text-gold-100",
  lounge: "bg-gold-300/26 text-gold-100",
};

const seatKindLegend = [
  { key: "wheelchair", label: "PCD", icon: "user" as const },
  { key: "companion", label: "Acompanhante", icon: "user" as const },
  { key: "reduced_mobility", label: "Mobilidade reduzida", icon: "user" as const },
  { key: "guide_dog", label: "Cão-guia", icon: "info" as const },
  { key: "premium_motion", label: "D-BOX/Movimento", icon: "zap" as const },
  { key: "couple_left", label: "Casal", icon: "ticket" as const },
  { key: "vip_recliner", label: "VIP Recliner", icon: "sparkles" as const },
  { key: "lounge", label: "Lounge", icon: "sparkles" as const },
] satisfies Array<{ key: SeatNode["seatKind"]; label: string; icon: "user" | "info" | "zap" | "ticket" | "sparkles" }>;

export const SeatMap = ({
  seats,
  expectedSeatCount,
  isSeatSelectable,
}: {
  seats: SeatNode[];
  expectedSeatCount?: number;
  isSeatSelectable?: (seat: SeatNode) => boolean;
}) => {
  const reduceMotion = useReducedMotion();
  const { selectedSeatIds, ticketQuantities, toggleSeat } = useBookingStore();
  const [zoomLevel, setZoomLevel] = useState(100);

  const rows = useMemo(() => {
    const grouped = new Map<string, SeatNode[]>();

    seats.forEach((seat) => {
      const rowSeats = grouped.get(seat.row) ?? [];
      rowSeats.push(seat);
      grouped.set(seat.row, rowSeats);
    });

    return Array.from(grouped.entries());
  }, [seats]);

  const maxSeatsInRow = useMemo(() => {
    return Math.max(...rows.map(([_, rowSeats]) => rowSeats.length), 1);
  }, [rows]);

  const availableKinds = useMemo(
    () =>
      new Set(
        seats
          .map((seat) => seat.seatKind)
          .filter((kind) => kind !== "standard"),
      ),
    [seats],
  );
  const requiredSeats = useMemo(
    () =>
      expectedSeatCount ??
      Object.values(ticketQuantities).reduce((sum, quantity) => sum + (quantity ?? 0), 0),
    [expectedSeatCount, ticketQuantities],
  );
  const fallbackIsSeatSelectable = (seat: SeatNode) => {
    const pcdQty = ticketQuantities.meia_pcd ?? 0;
    const companionQty = ticketQuantities.acompanhante_pcd ?? 0;

    if (seat.seatKind === "wheelchair" && pcdQty === 0) {
      return false;
    }
    if (seat.seatKind === "companion" && companionQty === 0) {
      return false;
    }
    return true;
  };

  return (
    <div className="w-full max-w-full space-y-6">
      <div className="rounded-[var(--radius-lg)] border border-white/8 bg-black/35 p-4 text-center text-sm text-foreground-muted">
        <div className="mx-auto mb-3 h-2 max-w-lg rounded-full bg-gradient-to-r from-white/15 via-white/60 to-white/15" />
        Tela
        {requiredSeats <= 0 ? (
          <p className="mt-2 text-xs text-foreground-muted">
            Defina a quantidade de ingressos para habilitar a seleção de assentos.
          </p>
        ) : null}
      </div>
      <div className="w-full relative pb-1">
        <div className="mb-3 flex items-center justify-end gap-3 px-1 text-xs text-foreground-muted">
          <span>Lupa / Zoom</span>
          <input 
            type="range" 
            min="100" 
            max="300" 
            value={zoomLevel} 
            onChange={(e) => setZoomLevel(Number(e.target.value))} 
            className="w-24 accent-accent-red-500 bg-surface rounded-full h-1.5" 
            aria-label="Controle de zoom do mapa de assentos"
          />
        </div>
        <div className="w-full rounded-[var(--radius-lg)] border border-border/70 bg-background-strong/70 p-4 sm:p-5 overflow-auto touch-pan-x touch-pan-y relative custom-scrollbar">
          <div style={{ minWidth: `${zoomLevel}%`, transition: "min-width 0.15s ease-out" }}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 text-[10px] sm:text-xs uppercase tracking-[0.24em] text-foreground-muted sticky left-0">
              <span>Assentos interativos</span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="zoomIn" size="xs" />
                auto-escala
              </span>
            </div>
            <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
              {rows.map(([row, rowSeats]) => (
                <div key={row} className="flex items-center gap-2 sm:gap-3 lg:gap-4 w-full">
                  <span className="w-3 sm:w-5 md:w-6 shrink-0 text-center text-[10px] sm:text-xs md:text-sm font-semibold text-foreground-muted">{row}</span>
                  <div className="grid flex-1 gap-1 sm:gap-1.5 md:gap-2" style={{ gridTemplateColumns: `repeat(${maxSeatsInRow}, minmax(0, 1fr))` }}>
                    {rowSeats.map((seat) => {
                    const canSelectByQuota =
                      selectedSeatIds.includes(seat.id) || selectedSeatIds.length < requiredSeats;
                    const canSelectByStatus = seat.status === "available";
                    const canSelectByRule = isSeatSelectable
                      ? isSeatSelectable(seat)
                      : fallbackIsSeatSelectable(seat);
                    const isSelectable = canSelectByQuota && canSelectByStatus && canSelectByRule;
                    const selected = selectedSeatIds.includes(seat.id);
                    const ariaLabel = `Assento ${seat.label} - ${seat.seatKind.replace(/_/g, " ")}`;

                    return (
                      <motion.button
                        key={seat.id}
                        layout={!reduceMotion}
                        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                        type="button"
                        aria-pressed={selected}
                        aria-label={ariaLabel}
                        disabled={!isSelectable}
                        onClick={() => toggleSeat(seat.id)}
                        className={cn(
                          "relative flex aspect-square w-full items-center justify-center rounded-[3px] sm:rounded-[var(--radius-sm)] text-[8px] sm:text-[10px] md:text-xs font-semibold overflow-hidden transition-all duration-200",
                          selected ? seatStatusTone.selected : seatStatusTone[seat.status],
                          !selected && seatKindTone[seat.seatKind],
                          !canSelectByRule && "opacity-45",
                        )}
                      >
                        {seat.number}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-foreground-muted">
        {[
          ["Disponível", "bg-foreground/12"],
          ["Selecionado", "bg-accent-red-500"],
          ["Hold de outro usuário", "bg-warning/30"],
          ["Indisponível", "bg-white/6"],
        ].map(([label, tone]) => (
          <span key={label} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2">
            <span className={cn("h-3 w-3 rounded-full", tone)} />
            {label}
          </span>
        ))}
        {seatKindLegend
          .filter((item) => availableKinds.has(item.key))
          .map((item) => (
            <span key={item.key} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2">
              <Icon name={item.icon} size="xs" />
              {item.label}
            </span>
          ))}
      </div>
    </div>
  );
};
