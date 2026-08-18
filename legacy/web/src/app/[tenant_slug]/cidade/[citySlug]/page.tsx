import { notFound } from "next/navigation";
import { CinemaStrip } from "@/components/cinema/cinema-strip";
import { ComingSoonRail } from "@/components/cinema/coming-soon-rail";
import { HeroSpotlight } from "@/components/cinema/hero-spotlight";
import { MovieCard } from "@/components/cinema/movie-card";
import { QuickFilterChips } from "@/components/cinema/quick-filter-chips";
import { ShowtimeCardV2 } from "@/components/cinema/showtime-card-v2";
import { SectionHeading } from "@/components/ui/section-heading";
import { copy } from "@/lib/copy/catalog";
import {
  getTenantCinemas,
  getTenantCity,
  getTenantMovies,
  getTenantMovieShowtimes,
} from "@/lib/storefront/api";

const getTodayIso = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const addDaysToIso = (isoDate: string, days: number) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

export default async function TenantCityPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant_slug: string; citySlug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { tenant_slug, citySlug } = await params;
  const { date } = await searchParams;
  const todayIso = getTodayIso();
  const availableDates = Array.from({ length: 7 }, (_, index) => addDaysToIso(todayIso, index));
  const selectedDate = date && availableDates.includes(date) ? date : todayIso;

  const [city, movies, cinemas] = await Promise.all([
    getTenantCity(tenant_slug, citySlug),
    getTenantMovies(tenant_slug, citySlug),
    getTenantCinemas(tenant_slug, citySlug),
  ]);

  if (!city) {
    notFound();
  }

  const featuredMovie = movies[0] ?? null;
  const showtimeGroups = await Promise.all(
    movies.slice(0, 8).map(async (movie) => ({
      movie,
      sessions: await getTenantMovieShowtimes(tenant_slug, citySlug, movie.slug, {
        date: selectedDate,
      }).catch(() => []),
    })),
  );
  const sessionCards = showtimeGroups.flatMap((group) =>
    group.sessions.slice(0, 2).map((session) => ({
      movie: group.movie,
      session,
    })),
  );
  const comingSoon = movies.filter((movie) => movie.status === "em-breve");
  const nowShowing = movies.filter((movie) => movie.status === "em-cartaz");

  const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  const dateChips = availableDates.map((iso, index) => ({
    iso,
    label:
      index === 0
        ? `Hoje · ${dayFormatter.format(new Date(`${iso}T12:00:00-03:00`)).replace(".", "")}`
        : dayFormatter.format(new Date(`${iso}T12:00:00-03:00`)).replace(".", ""),
    isActive: iso === selectedDate,
  }));

  return (
    <main className="space-y-16 pb-16">
      {featuredMovie ? <HeroSpotlight city={city} movie={featuredMovie} tenantSlug={tenant_slug} /> : null}
      <section className="page-shell grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <SectionHeading
            eyebrow={copy("cityPageEyebrow")}
            title={`${copy("cityPageTitlePrefix")} ${city.name} ${copy("cityPageTitleSuffix")}`}
            description={copy("cityPageDescription")}
          />
          <QuickFilterChips citySlug={city.slug} dateChips={dateChips} tenantSlug={tenant_slug} />
        </div>
        <aside className="rounded-[var(--radius-md)] border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-accent-red-500">{copy("cityPageQuickNavEyebrow")}</p>
          <div className="mt-4 space-y-3 text-sm text-foreground-muted">
            <p>{copy("cityPageQuickNavSearch")}</p>
            <p>{copy("cityPageQuickNavToday")}</p>
            <p>{copy("cityPageQuickNavComingSoon")}</p>
          </div>
        </aside>
      </section>
      <section id="sessoes-hoje" className="page-shell scroll-mt-28 space-y-6">
        <SectionHeading
          eyebrow="Sessões"
          title="Sessões disponíveis"
          description="Escolha o horário e o cinema para continuar para os assentos."
        />
        {sessionCards.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-border bg-surface px-4 py-5 text-sm text-foreground-muted">
            Ainda não há sessões cadastradas para esta data.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sessionCards.map(({ movie, session }) => {
                const cinema = cinemas.find((item) => item.id === session.cinemaId);
              if (!cinema) return null;
              return (
                <li key={session.id}>
                  <ShowtimeCardV2
                    cinema={cinema}
                    citySlug={citySlug}
                    movie={movie}
                    session={session}
                    tenantSlug={tenant_slug}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section id="em-cartaz" className="page-shell scroll-mt-28 space-y-6">
        <SectionHeading title={copy("cityPageMoviesTitle")} />
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
          {nowShowing.map((movie) => (
            <li key={movie.id} className="h-full">
              <MovieCard citySlug={citySlug} movie={movie} tenantSlug={tenant_slug} />
            </li>
          ))}
        </ul>
      </section>
      {comingSoon.length > 0 ? (
        <section id="pre-estreias" className="page-shell scroll-mt-28 space-y-6">
          <SectionHeading title={copy("cityPageComingSoonTitle")} />
          <ComingSoonRail citySlug={citySlug} movies={comingSoon} tenantSlug={tenant_slug} />
        </section>
      ) : null}
      <section id="cinemas" className="page-shell scroll-mt-28 space-y-6">
        <SectionHeading
          eyebrow={copy("cityPageCinemasEyebrow")}
          title={copy("cityPageCinemasTitle")}
          description={copy("cityPageCinemasDescription")}
        />
        <CinemaStrip cinemas={cinemas} tenantSlug={tenant_slug} />
      </section>
    </main>
  );
}
