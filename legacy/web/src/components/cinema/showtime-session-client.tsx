"use client";

import { useEffect, useMemo } from "react";
import { LiveSeatMap } from "@/components/cinema/live-seat-map";
import { SeatSelectionMobileStatus } from "@/components/cinema/seat-selection-mobile-status";
import { TicketTypeSelector } from "@/components/cinema/ticket-type-selector";
import { SessionBookingPanel } from "@/components/cinema/session-booking-panel";
import { OccupancyIndicator } from "@/components/cinema/occupancy-indicator";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { useBookingStore } from "@/stores/use-booking-store";
import { useShowtimeSeatMap } from "@/hooks/use-showtime-seat-map";
import type { SessionGroup, TicketType, SeatNode } from "@/types/storefront";

interface ShowtimeSessionClientProps {
  session: SessionGroup;
  movie: {
    id: string;
    slug: string;
    title: string;
    posterUrl: string;
  };
  cinema: {
    id: string;
    name: string;
  };
  city: {
    slug: string;
    name: string;
    state: string;
  };
  ticketTypes: Array<TicketType & { id?: string; priceModifier?: number }>;
  tenantSlug?: string;
}

export const ShowtimeSessionClient = ({
  session,
  movie,
  cinema,
  city,
  ticketTypes,
  tenantSlug,
}: ShowtimeSessionClientProps) => {
  const { setSession } = useBookingStore();
  const { seats, baseTicketPrice } = useShowtimeSeatMap(session.id);

  useEffect(() => {
    setSession(session.id);
  }, [session.id, setSession]);

  const liveSession = useMemo(
    () => ({
      ...session,
      seats,
      priceFrom: baseTicketPrice > 0 ? baseTicketPrice : session.priceFrom,
    }),
    [session, seats, baseTicketPrice],
  );

  return (
    <main className="page-shell min-w-0 space-y-6 overflow-x-clip pb-36 pt-8 landscape:pb-24 lg:pb-10">
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="min-w-0 space-y-6">
          <div className="flex flex-col gap-1 items-start rounded-[var(--radius-md)] border border-border/40 bg-surface/30 p-4 sm:p-5 backdrop-blur-md">
            <p className="text-[10px] uppercase tracking-[0.2em] text-accent-red-400 font-semibold shadow-sm">
              Seleção de assentos
            </p>
            <h1 className="font-display text-4xl sm:text-5xl text-foreground font-medium tracking-tight mt-1">
              {movie.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground-muted">
              <span className="font-medium text-foreground">
                {session.date} • {session.time}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="mapPin" size="xs" className="opacity-70" />
                {cinema.name} — Sala {session.room}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background-elevated px-2.5 py-0.5 text-xs font-medium">
                {session.format} • {session.language}
              </span>
              <OccupancyIndicator level={session.occupancy} />
            </div>
          </div>
          <TicketTypeSelector ticketTypes={ticketTypes} />
          <SeatSelectionMobileStatus citySlug={city.slug} session={liveSession} tenantSlug={tenantSlug} />
          <Card>
            <LiveSeatMap showtimeId={session.id} />
          </Card>
        </section>
        <SessionBookingPanel
          cinemaName={cinema.name}
          cityState={city.state}
          citySlug={city.slug}
          movieSlug={movie.slug}
          movieTitle={movie.title}
          moviePosterUrl={movie.posterUrl}
          session={liveSession}
          tenantSlug={tenantSlug}
        />
      </div>
    </main>
  );
};
