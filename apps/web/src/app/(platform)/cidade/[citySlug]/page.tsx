import { notFound } from "next/navigation";
import { ComingSoonRail } from "@/components/cinema/coming-soon-rail";
import { CinemaStrip } from "@/components/cinema/cinema-strip";
import { HeroSpotlight } from "@/components/cinema/hero-spotlight";
import { MovieCard } from "@/components/cinema/movie-card";
import { QuickFilterChips } from "@/components/cinema/quick-filter-chips";
import { ShowtimeCardV2 } from "@/components/cinema/showtime-card-v2";
import { SectionHeading } from "@/components/ui/section-heading";
import { copy } from "@/lib/copy/catalog";
import {
  getCinemasForCity,
  getCityBySlug,
  getFeaturedMovieForCity,
  getMoviesForCity,
  getSessionsForCity,
} from "@/lib/storefront/service";

const getTodayInBahiaIso = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const addDaysToIso = (isoDate: string, days: number) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

export async function generateMetadata({ params }: { params: Promise<{ citySlug: string }> }) {
  const { citySlug } = await params;
  const city = await getCityBySlug(citySlug);

  if (!city) {
    return {};
  }

  return {
    title: `${city.name} agora`,
    description: city.intro,
  };
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ citySlug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { citySlug } = await params;
  const { date } = await searchParams;
  const [city, movies, comingSoon, sessions, featuredMovie, cinemas] = await Promise.all([
    getCityBySlug(citySlug),
    getMoviesForCity(citySlug, "em-cartaz"),
    getMoviesForCity(citySlug, "em-breve"),
    getSessionsForCity(citySlug),
    getFeaturedMovieForCity(citySlug),
    getCinemasForCity(citySlug),
  ]);

  if (!city || !featuredMovie) {
    notFound();
  }

  const todayIso = getTodayInBahiaIso();
  const availableDates = Array.from({ length: 7 }, (_, index) => addDaysToIso(todayIso, index));
  const selectedDate = date && availableDates.includes(date) ? date : todayIso;
  const visibleSessions = sessions.filter((session) => session.date === selectedDate);
  const dateLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  const dayLabel = (isoDate: string, index: number) => {
    if (index === 0) return `Hoje · ${dateLabelFormatter.format(new Date(`${isoDate}T12:00:00-03:00`))}`;
    const label = dateLabelFormatter.format(new Date(`${isoDate}T12:00:00-03:00`));
    return label.replace(".", "");
  };
  const dateChips = availableDates.map((isoDate, index) => ({
    iso: isoDate,
    label: dayLabel(isoDate, index),
    isActive: isoDate === selectedDate,
  }));
  const selectedDateLong = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${selectedDate}T12:00:00-03:00`));
  const sessionsTitle = `Sessões para ${selectedDateLong}`;
  const sessionsDescription = "Escolha o horário e o cinema para continuar para os assentos.";

  return (
    <main className="space-y-16 pb-16">
      <HeroSpotlight city={city} movie={featuredMovie} />
      <section className="page-shell grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <SectionHeading
            eyebrow={copy("cityPageEyebrow")}
            title={`${copy("cityPageTitlePrefix")} ${city.name} ${copy("cityPageTitleSuffix")}`}
            description={copy("cityPageDescription")}
          />
          <QuickFilterChips citySlug={city.slug} dateChips={dateChips} />
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
          eyebrow="Sessões de hoje"
          title={sessionsTitle}
          description={sessionsDescription}
        />
        {visibleSessions.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-border bg-surface px-4 py-5 text-sm text-foreground-muted">
            Ainda não há sessões cadastradas para esta data.
          </p>
        ) : (
          <ul className="space-y-4" aria-label={`Sessões para ${selectedDateLong}`}>
            {visibleSessions.slice(0, 8).map((session) => {
              const cinema = cinemas.find((item) => item.id === session.cinemaId);
              if (!cinema) return null;
              return (
                <li key={session.id}>
                  <ShowtimeCardV2 cinema={cinema} citySlug={citySlug} session={session} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section id="em-cartaz" className="page-shell scroll-mt-28 space-y-6">
        <SectionHeading
          title={copy("cityPageMoviesTitle")}
        />
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5" aria-label="Filmes em cartaz na cidade">
          {movies.map((movie) => (
            <li key={movie.id} className="h-full">
              <MovieCard
                citySlug={citySlug}
                movie={movie}
              />
            </li>
          ))}
        </ul>
      </section>
      <section id="pre-estreias" className="page-shell scroll-mt-28 space-y-6">
        <SectionHeading
          title={copy("cityPageComingSoonTitle")}
        />
        <ComingSoonRail citySlug={citySlug} movies={comingSoon} />
      </section>
      <section id="cinemas" className="page-shell scroll-mt-28 space-y-6">
        <SectionHeading
          eyebrow={copy("cityPageCinemasEyebrow")}
          title={copy("cityPageCinemasTitle")}
          description={copy("cityPageCinemasDescription")}
        />
        <CinemaStrip cinemas={cinemas} />
      </section>
    </main>
  );
}
