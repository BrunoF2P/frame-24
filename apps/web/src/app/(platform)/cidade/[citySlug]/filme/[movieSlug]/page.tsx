import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { AgeRatingBadge } from "@/components/cinema/age-rating-badge";
import { CinemaPricingInfo } from "@/components/cinema/cinema-pricing-info";
import { FormatBadge } from "@/components/cinema/format-badge";
import { OccupancyIndicator } from "@/components/cinema/occupancy-indicator";
import { TrailerDialogButton } from "@/components/cinema/trailer-dialog-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { formatRuntime } from "@/lib/utils";
import { getCinemasForCity, getCinemasForMovie, getCityBySlug, getMovieBySlug, getSessionsForCity, getSessionsForMovie } from "@/lib/storefront/service";
import { copy } from "@/lib/copy/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ citySlug: string; movieSlug: string }>;
}) {
  const { citySlug, movieSlug } = await params;
  const movie = await getMovieBySlug(citySlug, movieSlug);

  if (!movie) {
    return {};
  }

  return {
    title: movie.title,
    description: movie.synopsis,
  };
}

export default async function MovieDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ citySlug: string; movieSlug: string }>;
  searchParams: Promise<{ date?: string; lang?: string; format?: string }>;
}) {
  const { citySlug, movieSlug } = await params;
  const { date, lang, format: formatParam } = await searchParams;
  const [city, movie] = await Promise.all([getCityBySlug(citySlug), getMovieBySlug(citySlug, movieSlug)]);

  if (!city || !movie) {
    notFound();
  }

  const [sessions, cinemas, cityCinemas, citySessions] = await Promise.all([
    getSessionsForMovie(citySlug, movie.id),
    getCinemasForMovie(citySlug, movie.id),
    getCinemasForCity(citySlug),
    getSessionsForCity(citySlug),
  ]);
  const primarySession = sessions[0] ?? null;
  const occupancyLevel = sessions.some((session) => session.occupancy === "high")
    ? "high"
    : sessions.some((session) => session.occupancy === "medium")
      ? "medium"
      : "low";

  const addDaysIso = (isoDate: string, days: number) => {
    const [year, month, day] = isoDate.split("-").map(Number);
    const dateValue = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days));
    return dateValue.toISOString().slice(0, 10);
  };
  const todayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const sortedSessions = [...sessions].sort((left, right) => {
    const leftStamp = new Date(`${left.date}T${left.time}:00`).getTime();
    const rightStamp = new Date(`${right.date}T${right.time}:00`).getTime();
    return leftStamp - rightStamp;
  });
  const sessionDates = Array.from(new Set(sortedSessions.map((session) => session.date)));
  const previewStartIso = movie.releaseDate && movie.releaseDate > todayIso ? movie.releaseDate : todayIso;
  const previewDates = Array.from({ length: 7 }, (_, index) => addDaysIso(previewStartIso, index));
  const dateOptions = (sessionDates.length > 0 ? sessionDates : previewDates).slice(0, 7);
  const selectedDate = date && dateOptions.includes(date) ? date : dateOptions[0] ?? todayIso;
  
  const allSessionsForSelectedDate = sessions.filter((session) => session.date === selectedDate);
  const availableLangs = Array.from(new Set(allSessionsForSelectedDate.map(s => s.language)));
  
  const sessionsForSelectedDate = allSessionsForSelectedDate.filter((session) => {
    if (lang === "dub" && session.language !== "Dublado") return false;
    if (lang === "sub" && session.language !== "Legendado") return false;
    if (formatParam === "vip" && !session.format.toLowerCase().includes("vip") && !session.format.toLowerCase().includes("macro")) return false;
    if (formatParam === "normal" && (session.format.toLowerCase().includes("vip") || session.format.toLowerCase().includes("macro"))) return false;
    return true;
  });

  const cinemasForGrouping = cinemas.length > 0 ? cinemas : cityCinemas;
  const sessionsByCinema = cinemasForGrouping
    .map((cinema) => ({
      cinema,
      sessions: sessionsForSelectedDate
        .filter((session) => session.cinemaId === cinema.id)
        .sort((a, b) => a.time.localeCompare(b.time)),
    }))
    .filter((group) => group.sessions.length > 0);
  const previewCinemas = cinemasForGrouping.slice(0, 4);
  const expectedAudio =
    movie.exhibitionMode === "ambos"
      ? "Dublado e legendado"
      : movie.exhibitionMode === "dublado"
        ? "Dublado"
        : "Legendado";
  const releaseDateLabel = movie.releaseDate
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Bahia",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(`${movie.releaseDate}T12:00:00-03:00`))
    : null;
  const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  const previewDayLabels = dateOptions.map((isoDate) => ({
    iso: isoDate,
    label:
      isoDate === todayIso
        ? `Hoje · ${dayFormatter.format(new Date(`${isoDate}T12:00:00-03:00`)).replace(".", "")}`
        : dayFormatter.format(new Date(`${isoDate}T12:00:00-03:00`)).replace(".", ""),
  }));

  return (
    <main className="space-y-10 pb-14 sm:space-y-12 sm:pb-16">
      <section className="page-shell pt-6 sm:pt-8">
        <figure className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-black">
          <Image
            src={movie.backdropUrl}
            alt={movie.title}
            fill
            priority
            loading="eager"
            fetchPriority="high"
            sizes="(max-width: 768px) calc(100vw - 2rem), (max-width: 1600px) calc(100vw - 5rem), 1440px"
            className="object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/62 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/58 via-transparent to-transparent" />
          <figcaption className="relative z-10 p-4 sm:p-6 lg:p-7">
            <div className="mx-auto grid min-h-[410px] max-w-[1180px] items-end gap-4 lg:min-h-[500px] lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
              <article className="space-y-4 rounded-[var(--radius-sm)] bg-black/32 p-3.5 backdrop-blur-[2px] sm:p-4.5 lg:space-y-5 lg:bg-transparent lg:p-0">
                <p className="text-sm font-medium text-white/80">{city.name}, {city.state}</p>
                <h1 className="text-balance text-[clamp(1.9rem,4.3vw,3.5rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-white">
                  {movie.title}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-white/82 sm:text-base sm:leading-7">
                  {movie.synopsis}
                </p>
                <p className="max-w-2xl text-sm leading-6 text-white/74">{movie.editorialNote}</p>
                <ul className="flex flex-wrap gap-2" aria-label="Classificação e formatos">
                  <li>
                    <AgeRatingBadge value={movie.ageRating} />
                  </li>
                  {movie.formats.map((format) => (
                    <li key={format}>
                      <FormatBadge label={format} />
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link
                      href={primarySession ? `/cidade/${citySlug}/sessao/${primarySession.id}` : `/cidade/${citySlug}`}
                    >
                      {copy("movieDetailChooseSession")}
                    </Link>
                  </Button>
                  <TrailerDialogButton title={movie.title} trailerUrl={movie.trailerUrl} variant="secondary" />
                </div>
              </article>
              <aside className="glass-panel rounded-[var(--radius-md)] border border-border/80 p-3.5 text-foreground sm:p-4">
                <figure className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-sm)] border border-border/70">
                  <Image
                    src={movie.posterUrl}
                    alt={`Pôster de ${movie.title}`}
                    fill
                    sizes="(max-width: 1023px) 50vw, 320px"
                    className="object-cover"
                  />
                </figure>
                <dl className="mt-3.5 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-foreground-muted">{copy("movieDetailDuration")}</dt>
                    <dd className="font-semibold text-foreground">{formatRuntime(movie.runtimeMinutes)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-foreground-muted">{copy("movieDetailGenres")}</dt>
                    <dd className="text-right font-semibold text-foreground">{movie.genres.join(" • ")}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-foreground-muted">{copy("movieDetailOriginalTitle")}</dt>
                    <dd className="font-semibold text-foreground">{movie.originalTitle}</dd>
                  </div>
                </dl>
                <div className="mt-3.5 border-t border-border/70 pt-3.5">
                  <OccupancyIndicator level={occupancyLevel} />
                  <p className="mt-2 text-xs text-foreground-muted">
                    {sessions.length} {copy("movieDetailSessionsFoundSuffix")}
                  </p>
                </div>
              </aside>
              <aside className="lg:col-span-2">
                <p className="text-sm text-white/80">
                  {copy("movieDetailCastLabel")} <span className="font-medium text-white">{movie.cast.join(" • ")}</span>
                </p>
              </aside>
            </div>
          </figcaption>
        </figure>
      </section>
      <section id="sessoes-disponiveis" className="page-shell space-y-5 sm:space-y-6">
        <SectionHeading
          eyebrow={copy("movieDetailSessionsEyebrow")}
          title={copy("movieDetailSessionsTitle")}
          description={copy("movieDetailSessionsDescription")}
        />
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-foreground-muted">{copy("movieDetailDateRailTitle")}</p>
          <nav aria-label="Escolha o dia da sessão">
            <ul className="flex flex-wrap gap-2">
              {previewDayLabels.map((day) => (
                <li key={day.iso}>
                  <Link
                    href={`/cidade/${citySlug}/filme/${movieSlug}?date=${day.iso}#sessoes-disponiveis`}
                    className={
                      day.iso === selectedDate
                        ? "inline-flex rounded-[var(--radius-sm)] border border-accent-red-500 bg-accent-red-50 px-3 py-1.5 text-xs font-semibold text-accent-red-700 dark:bg-accent-red-900/25 dark:text-accent-red-200"
                        : "inline-flex rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-1.5 text-xs text-foreground hover:border-accent-red-300"
                    }
                  >
                    {day.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* Sessão de Filtros Adicionada */}
          {allSessionsForSelectedDate.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-3 border-t border-border/50">
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground-muted">Idioma</span>
                <div className="flex flex-wrap gap-2">
                   <Link 
                     href={`?date=${selectedDate}${formatParam ? `&format=${formatParam}` : ''}#sessoes-disponiveis`} 
                     className={!lang ? "inline-flex rounded-full border border-foreground bg-foreground px-3 py-1 text-xs font-medium text-background" : "inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground hover:border-foreground/50"}
                   >
                     Todos
                   </Link>
                   {availableLangs.map(l => {
                     const isDub = l.toLowerCase().includes("dublado");
                     const lCode = isDub ? "dub" : "sub";
                     return (
                       <Link 
                         key={l} 
                         href={`?date=${selectedDate}&lang=${lCode}${formatParam ? `&format=${formatParam}` : ''}#sessoes-disponiveis`} 
                         className={lang === lCode ? "inline-flex rounded-full border border-foreground bg-foreground px-3 py-1 text-xs font-medium text-background" : "inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground hover:border-foreground/50"}
                       >
                         {l}
                       </Link>
                     )
                   })}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground-muted">Experiência</span>
                <div className="flex flex-wrap gap-2">
                   <Link 
                     href={`?date=${selectedDate}${lang ? `&lang=${lang}` : ''}#sessoes-disponiveis`} 
                     className={!formatParam ? "inline-flex rounded-full border border-foreground bg-foreground px-3 py-1 text-xs font-medium text-background" : "inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground hover:border-foreground/50"}
                   >
                     Qualquer
                   </Link>
                   <Link 
                     href={`?date=${selectedDate}&format=normal${lang ? `&lang=${lang}` : ''}#sessoes-disponiveis`} 
                     className={formatParam === 'normal' ? "inline-flex rounded-full border border-foreground bg-foreground px-3 py-1 text-xs font-medium text-background" : "inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground hover:border-foreground/50"}
                   >
                     Normal
                   </Link>
                   <Link 
                     href={`?date=${selectedDate}&format=vip${lang ? `&lang=${lang}` : ''}#sessoes-disponiveis`} 
                     className={formatParam === 'vip' ? "inline-flex rounded-full border border-foreground bg-foreground px-3 py-1 text-xs font-medium text-background" : "inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground hover:border-foreground/50"}
                   >
                     Salas Especiais (VIP)
                   </Link>
                </div>
              </div>
            </div>
          )}
        </div>
        {sessionDates.length === 0 ? (
          <div className="relative pt-2">
            <ol className="space-y-4 relative" aria-label="Sessões agrupadas por cinema (Preview)">
              {previewCinemas.map((cinema) => {
                const compatibleFormats = cinema.formats.filter((format) => movie.formats.includes(format));
                const cinemaTimes = Array.from(
                  new Set(
                    citySessions
                      .filter((session) => session.cinemaId === cinema.id)
                      .map((session) => session.time)
                  )
                )
                  .sort((left, right) => left.localeCompare(right))
                  .slice(0, 4);
                const mockTimes = cinemaTimes.length > 0 ? cinemaTimes : ["14:00", "16:30", "19:00", "21:30"];
                const mockFormat = compatibleFormats[0] ?? movie.formats[0] ?? "2D";

                return (
                  <li key={cinema.id} className="opacity-40 [&>article]:border-dashed pointer-events-none select-none transition-opacity">
                    <article className="glass-panel rounded-[var(--radius-md)] border border-border p-4 sm:p-5">
                      <header className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold leading-tight text-foreground">{cinema.name}</h3>
                          <p className="text-sm text-foreground-muted">
                            {cinema.network} • {cinema.neighborhood}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-foreground-muted border border-border/50 uppercase tracking-wider">{copy("movieDetailEmptyStatusValue")}</span>
                        </div>
                      </header>
                      <p className="mt-2 text-sm text-foreground-muted">{cinema.address}</p>
                      <p className="mt-2 text-sm text-foreground-muted">
                        {copy("movieDetailFormatsLabel")} <span className="font-medium text-foreground">
                          {(compatibleFormats.length > 0 ? compatibleFormats : movie.formats).join(" • ")}
                        </span> • {copy("movieDetailAudioLabel")}{" "}
                        <span className="font-medium text-foreground">{expectedAudio}</span>
                      </p>
                      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" aria-label={`Horários em ${cinema.name}`}>
                        {mockTimes.map((time, idx) => (
                          <li key={idx}>
                            <div className="flex min-h-16 flex-col justify-center rounded-[var(--radius-sm)] border border-border/50 bg-background/30 px-3 py-2.5">
                              <span className="text-lg font-semibold text-foreground/40 line-through">{time}</span>
                              <span className="text-xs text-foreground-muted/40 line-clamp-1">
                                {mockFormat} • {expectedAudio.split(" e ")[0]}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </article>
                  </li>
                );
              })}
              
              <div className="absolute inset-x-0 bottom-[-2rem] top-[10%] z-10 flex flex-col items-center justify-center bg-gradient-to-t from-background via-background/95 to-transparent p-6 text-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-accent-red-500/20 bg-accent-red-500/10 shadow-[0_0_40px_rgba(255,0,0,0.15)] mb-6 overflow-hidden">
                  <div className="absolute inset-0 bg-accent-red-500/20 blur-xl"></div>
                  <CalendarDays className="relative z-10 h-7 w-7 text-accent-red-500" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-white drop-shadow-md sm:text-3xl">
                  {copy("movieDetailEmptyTitle")}
                </h3>
                <p className="mt-3 max-w-lg text-base leading-relaxed text-foreground-muted drop-shadow-sm">
                  {copy("movieDetailEmptyDescription")}
                </p>
                {releaseDateLabel && (
                  <div className="mt-6 inline-flex items-center rounded-full border border-accent-red-500/30 bg-accent-red-500/15 px-4 py-1.5 text-sm font-semibold text-accent-red-400 backdrop-blur-sm shadow-[0_0_20px_rgba(255,0,0,0.1)]">
                    {copy("movieDetailEmptyReleasePrefix")} {releaseDateLabel}
                  </div>
                )}
                <Button asChild variant="secondary" className="mt-8 px-8 border-white/10 hover:bg-white/10 bg-white/5 backdrop-blur-md">
                  <Link href={`/cidade/${citySlug}/filmes`}>{copy("movieDetailEmptyCta")}</Link>
                </Button>
              </div>
            </ol>
          </div>

        ) : (
          <ol className="space-y-4" aria-label="Sessões agrupadas por cinema">
            {sessionsByCinema.map((group) => {
              const cinemaOccupancy = group.sessions.some((session) => session.occupancy === "high")
                ? "high"
                : group.sessions.some((session) => session.occupancy === "medium")
                  ? "medium"
                  : "low";
              const cinemaFormats = Array.from(new Set(group.sessions.map((session) => session.format))).join(" • ");
              const cinemaLanguages = Array.from(new Set(group.sessions.map((session) => session.language))).join(" • ");
              const cinemaSubtitles = Array.from(new Set(group.sessions.map((session) => session.subtitle))).join(" • ");

              return (
                <li key={group.cinema.id}>
                  <article className="glass-panel rounded-[var(--radius-md)] border border-border p-4 sm:p-5">
                    <header className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold leading-tight text-foreground">{group.cinema.name}</h3>
                        <p className="text-sm text-foreground-muted">
                          {group.cinema.network} • {group.cinema.neighborhood}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CinemaPricingInfo cinemaName={group.cinema.name} />
                        <OccupancyIndicator level={cinemaOccupancy} />
                        <span className="text-sm text-foreground-muted">{group.sessions.length} {copy("movieDetailTimesSuffix")}</span>
                      </div>
                    </header>
                    <p className="mt-2 text-sm text-foreground-muted">{group.cinema.address}</p>
                    <p className="mt-2 text-sm text-foreground-muted">
                      {copy("movieDetailFormatsLabel")} <span className="font-medium text-foreground">{cinemaFormats}</span> • {copy("movieDetailAudioLabel")}{" "}
                      <span className="font-medium text-foreground">{cinemaLanguages}</span> • {copy("movieDetailSubtitleLabel")}{" "}
                      <span className="font-medium text-foreground">{cinemaSubtitles}</span>
                    </p>
                    <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" aria-label={`Horários em ${group.cinema.name}`}>
                      {group.sessions.map((session) => (
                        <li key={session.id}>
                          <Link
                            href={`/cidade/${citySlug}/sessao/${session.id}`}
                            className="flex min-h-16 flex-col justify-center rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5 hover:border-accent-red-500/40 hover:bg-background-strong"
                          >
                            <span className="text-lg font-semibold text-foreground">{session.time}</span>
                            <span className="text-xs text-foreground-muted">
                              {session.format} • {session.language} • {session.subtitle}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </article>
                </li>
              );
            })}
          </ol>
        )}
        {sessionDates.length > 0 && sessionsByCinema.length === 0 ? (
          <p className="rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3 text-sm text-foreground-muted">
            Nenhuma sessão encontrada para os filtros selecionados. Tente remover os filtros ou escolher outra data.
          </p>
        ) : null}
      </section>
    </main>
  );
}
