"use client";

import { useShowtimeSeatMap } from "@/hooks/use-showtime-seat-map";
import { SeatMap } from "@/components/cinema/seat-map";
import type { SeatNode } from "@/types/storefront";

export const LiveSeatMap = ({
  showtimeId,
  isSeatSelectable,
}: {
  showtimeId: string;
  isSeatSelectable?: (seat: SeatNode) => boolean;
}) => {
  const { seats, isLoading, isError, refetch } = useShowtimeSeatMap(showtimeId);

  if (isLoading) {
    return (
      <div className="w-full rounded-[var(--radius-lg)] border border-border/70 bg-background-strong/70 p-8 flex items-center justify-center min-h-[200px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent-red-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full rounded-[var(--radius-lg)] border border-danger/30 bg-danger/5 p-6 text-center">
        <p className="text-sm text-danger">Erro ao carregar assentos.</p>
        <button
          type="button"
          onClick={refetch}
          className="mt-3 text-xs font-semibold text-accent-red-400 underline underline-offset-2"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!seats.length) {
    return (
      <div className="w-full rounded-[var(--radius-lg)] border border-border/70 bg-background-strong/70 p-8 text-center">
        <p className="text-sm text-foreground-muted">Nenhum assento disponível para esta sessão.</p>
      </div>
    );
  }

  return <SeatMap seats={seats} isSeatSelectable={isSeatSelectable} />;
};
