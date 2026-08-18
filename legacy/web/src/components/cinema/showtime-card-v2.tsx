import Image from "next/image";
import Link from "next/link";
import type { Cinema, MovieSummary, SessionGroup } from "@/types/storefront";
import { AgeRatingBadge } from "@/components/cinema/age-rating-badge";
import { FormatBadge } from "@/components/cinema/format-badge";
import { OccupancyIndicator } from "@/components/cinema/occupancy-indicator";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatCurrency, formatRuntime } from "@/lib/utils";
import { buildShowtimeHref } from "@/lib/showtime-routing";

export const ShowtimeCardV2 = ({
  citySlug,
  session,
  cinema,
  movie,
  tenantSlug,
}: {
  citySlug: string;
  session: SessionGroup;
  cinema: Cinema;
  movie: MovieSummary;
  tenantSlug?: string;
}) => {
  const genres = movie.genres.slice(0, 2);
  const cinemaMeta = [cinema.network, cinema.neighborhood].filter(Boolean).join(" • ");

  return (
    <Card className="group relative h-full overflow-hidden p-0">
      <article className="h-full">
        <Link
          className="flex h-full flex-col"
          href={buildShowtimeHref({ citySlug, session, cinema, movie, tenantSlug })}
        >
          <figure className="relative aspect-[4/5] overflow-hidden bg-background-strong">
            <Image
              src={movie.posterUrl}
              alt={movie.title}
              fill
              sizes="(max-width: 768px) 90vw, (max-width: 1280px) 45vw, 30vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
            <div className="absolute left-3 top-3">
              <AgeRatingBadge value={movie.ageRating} />
            </div>
            <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-2">
              <FormatBadge label={session.format} />
            </div>
            <div className="absolute inset-x-3 top-12">
              <div className="max-w-full rounded-[var(--radius-md)] border border-white/15 bg-black/55 px-3 py-2 text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Icon name="mapPin" size="xs" className="shrink-0 text-accent-red-300" />
                  <p className="truncate text-sm font-semibold">{cinema.name}</p>
                </div>
                {cinemaMeta ? (
                  <p className="mt-1 truncate pl-5 text-[11px] uppercase tracking-[0.12em] text-white/72">
                    {cinemaMeta}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4 text-white">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">Sessão disponível</p>
                  <p className="mt-1 text-4xl font-bold tracking-[-0.05em]">{session.time}</p>
                  <p className="text-sm text-white/80">{session.date}</p>
                </div>
                <Icon name="arrowUpRight" size="md" className="opacity-80" />
              </div>
            </div>
          </figure>

          <div className="flex min-h-[164px] flex-1 flex-col justify-between gap-3 p-4">
            <div className="space-y-2.5">
              <div className="space-y-1">
                <h3 className="line-clamp-2 text-base font-bold leading-tight text-foreground">
                  {movie.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground-muted">
                  <span>{formatRuntime(movie.runtimeMinutes)}</span>
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <Icon name="mapPin" size="xs" className="text-accent-red-500" />
                    <span className="font-medium">{cinema.name}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                {genres.map((genre) => (
                  <Badge key={genre} variant="neutral" className="max-w-[48%] shrink truncate px-2 py-0.5 text-[10px] tracking-[0.05em]">
                    {genre}
                  </Badge>
                ))}
              </div>

              <div className="space-y-1.5 text-sm text-foreground-muted">
                <div className="rounded-[var(--radius-md)] border border-border bg-background-strong/55 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-red-500">
                        Cinema selecionado
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-foreground">{cinema.name}</p>
                    </div>
                    <Badge variant="neutral" className="shrink-0">
                      {session.time}
                    </Badge>
                  </div>
                  {cinemaMeta ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.1em] text-foreground-muted">{cinemaMeta}</p>
                  ) : null}
                  <p className="mt-2 line-clamp-2 text-sm text-foreground-muted">{cinema.address}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="neutral" className="px-2.5 py-1 text-[11px]">
                    Sala {session.room}
                  </Badge>
                  <Badge variant="neutral" className="px-2.5 py-1 text-[11px]">
                    {session.language}
                  </Badge>
                  <Badge variant="neutral" className="px-2.5 py-1 text-[11px]">
                    {formatCurrency(session.priceFrom)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <OccupancyIndicator level={session.occupancy} />
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent-red-500">
                <Icon name="ticket" size="xs" />
                Escolher assentos
              </p>
            </div>
          </div>
        </Link>
      </article>
    </Card>
  );
};
