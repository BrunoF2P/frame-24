import Image from "next/image";
import Link from "next/link";
import type { MovieSummary } from "@/types/storefront";
import { formatRuntime } from "@/lib/utils";
import { AgeRatingBadge } from "@/components/cinema/age-rating-badge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import {
  copy,
  formatReleaseDateLabel,
} from "@/lib/copy/catalog";

const formatReleaseDate = (date: string) => {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return null;
  return `${day}/${month}`;
};

const getReleaseLabel = (movie: MovieSummary) => {
  if (movie.status === "em-breve") {
    const release = movie.releaseDate ? formatReleaseDate(movie.releaseDate) : null;
    return release ? formatReleaseDateLabel(release) : null;
  }
  return null;
};

export const MovieCard = ({
  movie,
  citySlug,
}: {
  movie: MovieSummary;
  citySlug: string;
}) => {
  const releaseLabel = getReleaseLabel(movie);
  const isComingSoon = movie.status === "em-breve";
  const genres = movie.genres.slice(0, 2);

  return (
    <Card className={`group relative h-full overflow-hidden p-0 ${isComingSoon ? "border-accent-red-400/45 shadow-[0_14px_34px_rgba(122,20,24,0.28)]" : ""}`}>
      {isComingSoon ? (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] ring-1 ring-inset ring-accent-red-400/65"
          />
          <span className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex h-7 items-center justify-center bg-gradient-to-r from-accent-red-300 via-accent-red-500 to-accent-red-300 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
            Pré-venda
          </span>
        </>
      ) : null}
      <article className="h-full">
        <Link className="flex h-full flex-col" href={`/cidade/${citySlug}/filme/${movie.slug}`}>
          <figure className="relative aspect-[4/5] overflow-hidden bg-background-strong">
            <Image
              src={movie.posterUrl}
              alt={movie.title}
              fill
              sizes="(max-width: 768px) 70vw, (max-width: 1280px) 33vw, 20vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
            <div className={`absolute left-3 ${isComingSoon ? "top-10" : "top-3"}`}>
              <AgeRatingBadge value={movie.ageRating} />
            </div>
            {isComingSoon ? (
              <span className="absolute right-3 top-10 inline-flex items-center gap-1 rounded-full border border-gold-300/40 bg-black/65 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gold-100">
                <Icon name="calendar" size="xs" />
                {releaseLabel ?? copy("movieCardComingSoonBadge")}
              </span>
            ) : null}
            <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/78 via-black/15 to-transparent p-4 text-white">
              <p className="text-sm text-white/80">{formatRuntime(movie.runtimeMinutes)}</p>
              <Icon name="arrowUpRight" size="md" className="opacity-80" />
            </figcaption>
          </figure>
          <div className="flex min-h-[122px] flex-1 flex-col justify-between gap-2.5 p-3.5">
            <h3 className="truncate text-[15px] font-bold leading-tight text-foreground sm:text-base">
              {movie.title}
            </h3>
            <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
              {genres.map((genre) => (
                <Badge key={genre} variant="neutral" className="max-w-[48%] shrink truncate px-2 py-0.5 text-[10px] tracking-[0.05em]">
                  {genre}
                </Badge>
              ))}
            </div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent-red-500">
              <Icon name="ticket" size="xs" />
              {copy("movieCardPrimaryCta")}
            </p>
          </div>
        </Link>
      </article>
    </Card>
  );
};
