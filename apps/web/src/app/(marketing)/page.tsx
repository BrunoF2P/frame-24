import Link from "next/link";
import { BlockbusterRail } from "@/components/cinema/blockbuster-rail";
import { ComingSoonRail } from "@/components/cinema/coming-soon-rail";
import { CinemaStrip } from "@/components/cinema/cinema-strip";
import { HeroSpotlight } from "@/components/cinema/hero-spotlight";
import { QuickFilterChips } from "@/components/cinema/quick-filter-chips";
import { MovieCard } from "@/components/cinema/movie-card";
import { ShowtimeCardV2 } from "@/components/cinema/showtime-card-v2";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { copy } from "@/lib/copy/catalog";
import {
  getCinemasForCity,
  getDefaultCity,
  getFeaturedMovieForCity,
  getMoviesForCity,
  getSessionsForCity,
} from "@/lib/storefront/service";

export default async function HomePage() {
  const defaultCity = await getDefaultCity();

  if (!defaultCity) {
    return null;
  }

  const [featuredMovie, playingNow, comingSoon, cinemas, sessions] = await Promise.all([
    getFeaturedMovieForCity(defaultCity.slug),
    getMoviesForCity(defaultCity.slug, "em-cartaz"),
    getMoviesForCity(defaultCity.slug, "em-breve"),
    getCinemasForCity(defaultCity.slug),
    getSessionsForCity(defaultCity.slug),
  ]);

  if (!featuredMovie) {
    return null;
  }
  const blockbusterMovies = [...playingNow, ...comingSoon]
    .sort((left, right) => right.recommendationScore - left.recommendationScore)
    .slice(0, 3);

  return (
    <main className="space-y-16 pb-18">
      <HeroSpotlight city={defaultCity} movie={featuredMovie} />
      <section className="page-shell space-y-6">
        <SectionHeading
          eyebrow={copy("homeBlockbusterEyebrow")}
          title={copy("homeBlockbusterTitle")}
          description={copy("homeBlockbusterDescription")}
        />
        <BlockbusterRail citySlug={defaultCity.slug} movies={blockbusterMovies} />
      </section>
      <section className="page-shell space-y-6">
        <SectionHeading
          eyebrow={copy("homeQuickEyebrow")}
          title={copy("homeQuickTitle")}
          description={copy("homeQuickDescription")}
        />
        <QuickFilterChips citySlug={defaultCity.slug} />
      </section>
      <section className="page-shell space-y-6">
        <SectionHeading
          eyebrow={copy("homeSessionsEyebrow")}
          title={copy("homeSessionsTitle")}
          description={`Compare cinema, formato e preço em ${defaultCity.name}.`}
        />
        <ul className="space-y-4" aria-label={`Sessões encontradas em ${defaultCity.name}`}>
          {sessions.slice(0, 4).map((session) => {
            const cinema = cinemas.find((item) => item.id === session.cinemaId);
            if (!cinema) return null;
            return (
              <li key={session.id}>
                <ShowtimeCardV2
                  cinema={cinema}
                  citySlug={defaultCity.slug}
                  session={session}
                />
              </li>
            );
          })}
        </ul>
      </section>
      <section className="page-shell space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            title={copy("homeNowPlayingTitle")}
          />
          <Button asChild className="w-full sm:w-auto" size="lg" variant="secondary">
            <Link href={`/cidade/${defaultCity.slug}/filmes`}>
              {copy("homeNowPlayingCtaAllMovies")}
              <Icon name="arrowRight" size="sm" />
            </Link>
          </Button>
        </div>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5" aria-label="Filmes em cartaz">
          {playingNow.slice(0, 4).map((movie) => (
            <li key={movie.id} className="h-full">
              <MovieCard
                citySlug={defaultCity.slug}
                movie={movie}
              />
            </li>
          ))}
        </ul>
      </section>
      <section className="page-shell space-y-6">
        <SectionHeading
          title={copy("homeComingSoonTitle")}
        />
        <ComingSoonRail citySlug={defaultCity.slug} movies={comingSoon} />
      </section>
      <section className="page-shell">
        <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [copy("homeTrustRefundTitle"), copy("homeTrustRefundDescription")],
            [copy("homeTrustDigitalTitle"), copy("homeTrustDigitalDescription")],
            [copy("homeTrustSupportTitle"), copy("homeTrustSupportDescription")],
            [copy("homeTrustWalletTitle"), copy("homeTrustWalletDescription")],
          ].map(([title, description]) => (
            <article key={title} className="space-y-2">
              <p className="inline-flex items-center gap-2 text-lg font-semibold">
                <Icon
                  name={
                    title === copy("homeTrustRefundTitle")
                      ? "timer"
                      : title === copy("homeTrustDigitalTitle")
                        ? "ticket"
                        : title === copy("homeTrustSupportTitle")
                          ? "info"
                          : "wallet"
                  }
                  size="sm"
                  className="text-accent-red-500"
                />
                {title}
              </p>
              <p className="text-sm text-foreground-muted">{description}</p>
            </article>
          ))}
        </Card>
      </section>
      <section className="page-shell space-y-6">
        <SectionHeading
          eyebrow={copy("homeCinemasEyebrow")}
          title={copy("homeCinemasTitle")}
          description={copy("homeCinemasDescription")}
        />
        <CinemaStrip cinemas={cinemas} />
      </section>
    </main>
  );
}
