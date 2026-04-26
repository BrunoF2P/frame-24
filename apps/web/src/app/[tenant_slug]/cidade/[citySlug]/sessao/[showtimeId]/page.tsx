import { notFound } from "next/navigation";
import { OccupancyIndicator } from "@/components/cinema/occupancy-indicator";
import { SeatMap } from "@/components/cinema/seat-map";
import { SeatSelectionMobileStatus } from "@/components/cinema/seat-selection-mobile-status";
import { TicketTypeSelector } from "@/components/cinema/ticket-type-selector";
import { SessionBookingPanel } from "@/components/cinema/session-booking-panel";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  getCityBySlug,
  getCinemasForCity,
  getMovieById,
  getSessionByReference,
  getTicketTypesForSession,
} from "@/lib/storefront/service";

export default async function TenantCityShowtimePage({
  params,
}: {
  params: Promise<{ tenant_slug: string; citySlug: string; showtimeId: string }>;
}) {
  const { tenant_slug, citySlug, showtimeId } = await params;
  const session = await getSessionByReference(showtimeId, citySlug, tenant_slug);

  if (!session || session.citySlug !== citySlug) {
    notFound();
  }

  const [movie, cityCinemas, city] = await Promise.all([
    getMovieById(session.movieId, tenant_slug),
    getCinemasForCity(citySlug, tenant_slug),
    getCityBySlug(citySlug, tenant_slug),
  ]);
  const cinema = cityCinemas.find((item) => item.id === session.cinemaId) ?? null;

  if (!movie || !cinema || !city) {
    notFound();
  }

  const ticketTypes = await getTicketTypesForSession(
    citySlug,
    session.cinemaId,
    session.id,
    tenant_slug,
  );

  return (
    <main className="page-shell min-w-0 space-y-6 overflow-x-clip pb-36 pt-8 landscape:pb-24 lg:pb-10">
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="min-w-0 space-y-6">
          <div className="flex flex-col items-start gap-1 rounded-[var(--radius-md)] border border-border/40 bg-surface/30 p-4 backdrop-blur-md sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-red-400 shadow-sm">
              Seleção de assentos
            </p>
            <h1 className="mt-1 font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
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
          <SeatSelectionMobileStatus citySlug={citySlug} session={session} />
          <Card>
            <SeatMap seats={session.seats} />
          </Card>
        </section>
        <SessionBookingPanel
          cinemaName={cinema.name}
          cityState={city.state}
          citySlug={citySlug}
          movieSlug={movie.slug}
          movieTitle={movie.title}
          moviePosterUrl={movie.posterUrl}
          session={session}
          tenantSlug={tenant_slug}
        />
      </div>
    </main>
  );
}
