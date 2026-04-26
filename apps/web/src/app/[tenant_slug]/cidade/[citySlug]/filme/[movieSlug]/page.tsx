import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AgeRatingBadge } from "@/components/cinema/age-rating-badge";
import { FormatBadge } from "@/components/cinema/format-badge";
import { OccupancyIndicator } from "@/components/cinema/occupancy-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SectionHeading } from "@/components/ui/section-heading";
import { buildShowtimeHref } from "@/lib/showtime-routing";
import { formatCurrency, formatRuntime } from "@/lib/utils";
import {
  getTenantCinemas,
  getTenantCity,
  getTenantMovie,
  getTenantMovieShowtimes,
} from "@/lib/storefront/api";

export default async function TenantMovieDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant_slug: string; citySlug: string; movieSlug: string }>;
  searchParams: Promise<{ date?: string; language?: string; format?: string }>;
}) {
  const { tenant_slug, citySlug, movieSlug } = await params;
  const filters = await searchParams;

  const [city, movie, cinemas, allSessions] = await Promise.all([
    getTenantCity(tenant_slug, citySlug),
    getTenantMovie(tenant_slug, citySlug, movieSlug).catch(() => null),
    getTenantCinemas(tenant_slug, citySlug),
    getTenantMovieShowtimes(tenant_slug, citySlug, movieSlug).catch(() => []),
  ]);

  if (!city || !movie) {
    notFound();
  }

  const availableDates = Array.from(new Set(allSessions.map((session) => session.date))).sort();
  const todayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: city.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const selectedDate =
    filters.date && availableDates.includes(filters.date)
      ? filters.date
      : availableDates[0] ?? undefined;

  const sessionsForDate = selectedDate
    ? allSessions.filter((session) => session.date === selectedDate)
    : allSessions;

  const availableLanguages = Array.from(new Set(sessionsForDate.map((session) => session.language))).sort();
  const availableFormats = Array.from(new Set(sessionsForDate.map((session) => session.format))).sort();

  const selectedLanguage =
    filters.language && availableLanguages.includes(filters.language)
      ? filters.language
      : undefined;
  const selectedFormat =
    filters.format && availableFormats.includes(filters.format)
      ? filters.format
      : undefined;

  const sessions = sessionsForDate.filter((session) => {
    if (selectedLanguage && session.language !== selectedLanguage) return false;
    if (selectedFormat && session.format !== selectedFormat) return false;
    return true;
  });

  const sessionsByCinema = cinemas
    .map((cinema) => ({
      cinema,
      sessions: sessions
        .filter((session) => session.cinemaId === cinema.id)
        .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)),
    }))
    .filter((group) => group.sessions.length > 0);
  const occupancyLevel = sessions.some((session) => session.occupancy === "high")
    ? "high"
    : sessions.some((session) => session.occupancy === "medium")
      ? "medium"
      : "low";
  const totalSessions = sessions.length;
  const sessionCountLabel = `${totalSessions} sess${totalSessions === 1 ? "ão" : "ões"}`;

  const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: city.timezone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });

  const buildMovieHref = (next: { date?: string; language?: string; format?: string }) => {
    const params = new URLSearchParams();
    if (next.date) params.set("date", next.date);
    if (next.language) params.set("language", next.language);
    if (next.format) params.set("format", next.format);

    const query = params.toString();
    return `/${tenant_slug}/cidade/${citySlug}/filme/${movieSlug}${query ? `?${query}` : ""}#sessoes`;
  };

  return (
    <main className="space-y-12 pb-16">
      <section className="page-shell pt-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="space-y-5">
            <p className="text-sm font-medium text-foreground-muted">
              {city.name}, {city.state}
            </p>
            <h1 className="text-balance font-display text-5xl font-semibold tracking-[-0.03em]">
              {movie.title}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-foreground-muted">
              {movie.synopsis || movie.tagline}
            </p>
            <ul className="flex flex-wrap gap-2">
              <li>
                <AgeRatingBadge value={movie.ageRating} />
              </li>
              {movie.formats.map((format) => (
                <li key={format}>
                  <FormatBadge label={format} />
                </li>
              ))}
            </ul>
            <dl className="grid gap-3 text-sm text-foreground-muted sm:grid-cols-3">
              <div>
                <dt>Duração</dt>
                <dd className="font-semibold text-foreground">{formatRuntime(movie.runtimeMinutes)}</dd>
              </div>
              <div>
                <dt>Gêneros</dt>
                <dd className="font-semibold text-foreground">{movie.genres.join(" • ") || "Consulte"}</dd>
              </div>
              <div>
                <dt>Ocupação</dt>
                <dd className="pt-1"><OccupancyIndicator level={occupancyLevel} /></dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral" className="px-3 py-1.5 text-xs normal-case tracking-normal">
                <Icon name="building" size="xs" />
                {sessionsByCinema.length} cinema{sessionsByCinema.length === 1 ? "" : "s"}
              </Badge>
              <Badge variant="neutral" className="px-3 py-1.5 text-xs normal-case tracking-normal">
                <Icon name="calendar" size="xs" />
                {sessionCountLabel}
              </Badge>
              {selectedDate ? (
                <Badge variant="accent" className="px-3 py-1.5 text-xs normal-case tracking-normal">
                  <Icon name="clock" size="xs" />
                  {dayFormatter.format(new Date(`${selectedDate}T12:00:00Z`)).replace(".", "")}
                </Badge>
              ) : null}
            </div>
          </article>
          <aside>
            {movie.posterUrl ? (
              <figure className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-md)] border border-border bg-background-strong">
                <Image
                  src={movie.posterUrl}
                  alt={movie.title}
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              </figure>
            ) : null}
          </aside>
        </div>
      </section>

      <section id="sessoes" className="page-shell space-y-6">
        <SectionHeading
          eyebrow="Sessões disponíveis"
          title="Cinemas, datas e horários"
          description="Compare rapidamente idioma, formato e faixa de preço antes de seguir para os assentos."
        />
        {availableDates.length > 0 ? (
          <div className="space-y-3 rounded-[var(--radius-md)] border border-border bg-surface p-4 sm:p-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-red-500">Datas disponíveis</p>
              <div className="flex flex-wrap gap-2">
                {availableDates.map((date) => {
                  const isActive = date === selectedDate;
                  const label = dayFormatter.format(new Date(`${date}T12:00:00Z`)).replace(".", "");
                  const displayLabel =
                    date === todayIso ? `Hoje · ${label}` : isActive ? `Selecionada · ${label}` : label;
                  return (
                    <Button key={date} asChild variant={isActive ? "primary" : "chip"} size="sm">
                      <Link
                        href={buildMovieHref({
                          date,
                          language: selectedLanguage,
                          format: selectedFormat,
                        })}
                      >
                        <Icon name={isActive ? "clock" : "calendar"} size="xs" />
                        {displayLabel}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>

            {availableLanguages.length > 1 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-red-500">Idioma</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant={!selectedLanguage ? "primary" : "chip"} size="sm">
                    <Link href={buildMovieHref({ date: selectedDate, format: selectedFormat })}>
                      Todos
                    </Link>
                  </Button>
                  {availableLanguages.map((language) => (
                    <Button
                      key={language}
                      asChild
                      variant={selectedLanguage === language ? "primary" : "chip"}
                      size="sm"
                    >
                      <Link
                        href={buildMovieHref({
                          date: selectedDate,
                          language,
                          format: selectedFormat,
                        })}
                      >
                        {language}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {availableFormats.length > 1 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-red-500">Formato</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant={!selectedFormat ? "primary" : "chip"} size="sm">
                    <Link href={buildMovieHref({ date: selectedDate, language: selectedLanguage })}>
                      Todos
                    </Link>
                  </Button>
                  {availableFormats.map((format) => (
                    <Button
                      key={format}
                      asChild
                      variant={selectedFormat === format ? "primary" : "chip"}
                      size="sm"
                    >
                      <Link
                        href={buildMovieHref({
                          date: selectedDate,
                          language: selectedLanguage,
                          format,
                        })}
                      >
                        {format}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {sessionsByCinema.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-border bg-surface px-4 py-5 text-sm text-foreground-muted">
            Nenhuma sessão encontrada com esses filtros. Tente outro dia, idioma ou formato.
          </p>
        ) : (
          <ol className="space-y-4">
            {sessionsByCinema.map((group) => (
              <li key={group.cinema.id}>
                <article className="rounded-[var(--radius-md)] border border-border bg-surface p-4 sm:p-5">
                  <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">{group.cinema.name}</h2>
                      <p className="mt-1 text-sm text-foreground-muted">{group.cinema.network} • {group.cinema.neighborhood}</p>
                      <p className="mt-2 text-sm text-foreground-muted">{group.cinema.address}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="neutral" className="px-3 py-1 text-xs normal-case tracking-normal">
                        <Icon name="calendar" size="xs" />
                        {group.sessions.length} horário(s)
                      </Badge>
                      {group.cinema.formats.slice(0, 2).map((format) => (
                        <Badge key={format} variant="neutral" className="px-3 py-1 text-xs normal-case tracking-normal">
                          {format}
                        </Badge>
                      ))}
                    </div>
                  </header>
                  <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {group.sessions.map((session) => (
                      <li key={session.id}>
                        <Link
                          href={buildShowtimeHref({
                            citySlug,
                            session,
                            cinema: group.cinema,
                            movie,
                            tenantSlug: tenant_slug,
                          })}
                          className="group flex min-h-[110px] flex-col justify-between rounded-[var(--radius-md)] border border-border bg-background px-4 py-3.5 transition-colors hover:border-accent-red-500/40 hover:bg-background-strong"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xl font-semibold text-foreground">{session.time}</p>
                                <p className="text-xs uppercase tracking-[0.1em] text-foreground-muted">{session.date}</p>
                              </div>
                              <Icon
                                name="arrowUpRight"
                                size="sm"
                                className="text-foreground-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="neutral" className="px-2.5 py-1 text-[11px]">
                                {session.format}
                              </Badge>
                              <Badge variant="neutral" className="px-2.5 py-1 text-[11px]">
                                {session.language}
                              </Badge>
                              <Badge variant="neutral" className="px-2.5 py-1 text-[11px]">
                                Sala {session.room}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                            <span className="font-semibold text-accent-red-500">{formatCurrency(session.priceFrom)}</span>
                            <span className="text-foreground-muted">Selecionar assentos</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
