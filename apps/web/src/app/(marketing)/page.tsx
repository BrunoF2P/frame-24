import Link from "next/link";
import { BlockbusterRail } from "@/components/cinema/blockbuster-rail";
import { CinemaStrip } from "@/components/cinema/cinema-strip";
import { ComingSoonRail } from "@/components/cinema/coming-soon-rail";
import { HeroSpotlight } from "@/components/cinema/hero-spotlight";
import { MovieCard } from "@/components/cinema/movie-card";
import { QuickFilterChips } from "@/components/cinema/quick-filter-chips";
import { ShowtimeCardV2 } from "@/components/cinema/showtime-card-v2";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { SectionHeading } from "@/components/ui/section-heading";
import { copy } from "@/lib/copy/catalog";
import { resolveRequestedTenantSlug } from "@/lib/resolve-public-tenant";
import {
  getCinemasForCity,
  getDefaultCity,
  getFeaturedMovieForCity,
  getMoviesForCity,
  getSessionsForCity,
} from "@/lib/storefront/service";

async function TenantHome({ tenantSlug }: { tenantSlug: string }) {
  const defaultCity = await getDefaultCity(tenantSlug);
  if (!defaultCity) {
    return null;
  }

  const [featuredMovie, playingNow, comingSoon, cinemas, sessions] = await Promise.all([
    getFeaturedMovieForCity(defaultCity.slug, tenantSlug),
    getMoviesForCity(defaultCity.slug, "em-cartaz", tenantSlug),
    getMoviesForCity(defaultCity.slug, "em-breve", tenantSlug),
    getCinemasForCity(defaultCity.slug, tenantSlug),
    getSessionsForCity(defaultCity.slug, undefined, tenantSlug),
  ]);

  if (!featuredMovie) {
    return null;
  }

  const sessionMovies = [featuredMovie, ...playingNow, ...comingSoon];
  const blockbusterMovies = [...playingNow, ...comingSoon]
    .sort((left, right) => right.recommendationScore - left.recommendationScore)
    .slice(0, 3);

  return (
    <main className="space-y-16 pb-18">
      <HeroSpotlight city={defaultCity} movie={featuredMovie} tenantSlug={tenantSlug} />
      <section className="page-shell space-y-6">
        <SectionHeading
          eyebrow={copy("homeBlockbusterEyebrow")}
          title={copy("homeBlockbusterTitle")}
          description={copy("homeBlockbusterDescription")}
        />
        <BlockbusterRail citySlug={defaultCity.slug} movies={blockbusterMovies} tenantSlug={tenantSlug} />
      </section>
      <section className="page-shell space-y-6">
        <SectionHeading
          eyebrow={copy("homeQuickEyebrow")}
          title={copy("homeQuickTitle")}
          description={copy("homeQuickDescription")}
        />
        <QuickFilterChips citySlug={defaultCity.slug} tenantSlug={tenantSlug} />
      </section>
      <section className="page-shell space-y-6">
        <SectionHeading
          eyebrow={copy("homeSessionsEyebrow")}
          title={copy("homeSessionsTitle")}
          description={`Compare cinema, formato e preço em ${defaultCity.name}.`}
        />
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label={`Sessões encontradas em ${defaultCity.name}`}>
          {sessions.slice(0, 4).map((session) => {
            const cinema = cinemas.find((item) => item.id === session.cinemaId);
            const movie = sessionMovies.find((item) => item.id === session.movieId);
            if (!cinema || !movie) return null;
            return (
              <li key={session.id}>
                <ShowtimeCardV2
                  cinema={cinema}
                  citySlug={defaultCity.slug}
                  movie={movie}
                  session={session}
                  tenantSlug={tenantSlug}
                />
              </li>
            );
          })}
        </ul>
      </section>
      <section className="page-shell space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading title={copy("homeNowPlayingTitle")} />
          <Button asChild className="w-full sm:w-auto" size="lg" variant="secondary">
            <Link href={`/${tenantSlug}/cidade/${defaultCity.slug}/filmes`}>
              {copy("homeNowPlayingCtaAllMovies")}
              <Icon name="arrowRight" size="sm" />
            </Link>
          </Button>
        </div>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5" aria-label="Filmes em cartaz">
          {playingNow.slice(0, 4).map((movie) => (
            <li key={movie.id} className="h-full">
              <MovieCard citySlug={defaultCity.slug} movie={movie} tenantSlug={tenantSlug} />
            </li>
          ))}
        </ul>
      </section>
      <section className="page-shell space-y-6">
        <SectionHeading title={copy("homeComingSoonTitle")} />
        <ComingSoonRail citySlug={defaultCity.slug} movies={comingSoon} tenantSlug={tenantSlug} />
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
        <CinemaStrip cinemas={cinemas} tenantSlug={tenantSlug} />
      </section>
    </main>
  );
}

function Frame24Home() {
  return (
    <main className="pb-18">
      <section className="border-b border-border/60">
        <div className="page-shell grid gap-10 py-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end lg:py-24">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.22em] text-accent-red-500">Frame 24</p>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
                Plataforma de cinema multiempresa com site próprio por exibidor.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-foreground-muted">
                Cada empresa opera seu próprio ambiente, com unidades, sessões, clientes, checkout, pedido e perfil
                isolados por tenant. Em desenvolvimento, a demo roda por path ou subdomínio local.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/lawtrel-admin">
                  Abrir tenant principal
                  <Icon name="arrowRight" size="sm" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/empresa-b">Ver segunda empresa</Link>
              </Button>
            </div>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              ["Multiempresa", "Tenant por empresa, com domínio, catálogo, clientes e histórico independentes."],
              ["Compra end to end", "Sessão, assentos, checkout, pagamento interno, pedido e ingressos no mesmo fluxo."],
              ["Perfil do cliente", "Pedidos, ingressos, segurança e privacidade já conectados à API real."],
            ].map(([title, description]) => (
              <div key={title} className="border border-border/70 bg-background-elevated/70 p-5">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-2 text-sm leading-6 text-foreground-muted">{description}</p>
              </div>
            ))}
          </section>
        </div>
      </section>

      <section className="page-shell space-y-8 py-14">
        <SectionHeading
          eyebrow="Demonstração"
          title="Acesse as empresas da apresentação"
          description="Use os tenants locais para navegar pelo catálogo, testar compra e abrir a área do cliente."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            {
              title: "Lawtrel Admin",
              href: "/lawtrel-admin",
              description: "Tenant principal com catálogo completo, sessões, compra, pedido e perfil prontos para demo.",
            },
            {
              title: "Empresa B",
              href: "/empresa-b",
              description: "Segunda empresa para mostrar a estrutura multiempresa, unidades separadas e navegação isolada.",
            },
          ].map((tenant) => (
            <article key={tenant.href} className="border border-border/70 bg-background-elevated/60 p-6">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-accent-red-500">Tenant</p>
                <h2 className="text-2xl font-semibold text-foreground">{tenant.title}</h2>
                <p className="text-sm leading-6 text-foreground-muted">{tenant.description}</p>
                <Button asChild variant="secondary">
                  <Link href={tenant.href}>
                    Abrir ambiente
                    <Icon name="arrowRight" size="sm" />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default async function HomePage() {
  const tenantSlug = await resolveRequestedTenantSlug();

  if (tenantSlug) {
    return <TenantHome tenantSlug={tenantSlug} />;
  }

  return <Frame24Home />;
}
