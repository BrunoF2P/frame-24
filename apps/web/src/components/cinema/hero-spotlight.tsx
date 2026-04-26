import Image from "next/image";
import Link from "next/link";
import type { City, MovieSummary } from "@/types/storefront";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AgeRatingBadge } from "@/components/cinema/age-rating-badge";
import { FormatBadge } from "@/components/cinema/format-badge";
import { TrailerDialogButton } from "@/components/cinema/trailer-dialog-button";
import { copy } from "@/lib/copy/catalog";

export const HeroSpotlight = ({
  city,
  movie,
  tenantSlug,
}: {
  city: City;
  movie: MovieSummary;
  tenantSlug?: string;
}) => (
  <section className="page-shell pt-6 sm:pt-8">
    <figure className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-black text-white shadow-[0_24px_72px_rgba(0,0,0,0.28)]">
      <div className="absolute inset-0">
        <Image
          src={movie.backdropUrl}
          alt={movie.title}
          fill
          priority
          loading="eager"
          fetchPriority="high"
          sizes="(max-width: 768px) calc(100vw - 2rem), (max-width: 1280px) calc(100vw - 5rem), 1200px"
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/78 to-black/32" />
      </div>
      <figcaption className="relative grid gap-8 p-5 sm:p-7 xl:grid-cols-[1.2fr_280px] xl:p-10">
        <article className="space-y-5">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-white/76">
            <Icon name="mapPin" size="xs" />
            {city.name}, {city.state}
          </p>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-red-200">
              {copy("heroEyebrow")}
            </p>
            <h1 className="text-balance max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              {movie.title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/76 sm:text-lg">
              {movie.synopsis}
            </p>
            <p className="max-w-2xl text-sm text-white/65 sm:text-base">
              {copy("heroSupportingText")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AgeRatingBadge value={movie.ageRating} />
            {movie.formats.map((format) => (
              <FormatBadge key={format} label={format} />
            ))}
          </div>
          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap">
            <Button asChild className="w-full sm:w-auto" size="lg">
              <Link href={`${tenantSlug ? `/${tenantSlug}` : ""}/cidade/${city.slug}/filme/${movie.slug}`}>
                <Icon name="ticket" size="md" />
                {copy("heroPrimaryCta")}
              </Link>
            </Button>
            <TrailerDialogButton
              className="w-full sm:w-auto"
              title={movie.title}
              trailerUrl={movie.trailerUrl}
              variant="secondary"
            />
          </div>
        </article>
        <aside className="hidden rounded-[var(--radius-md)] border border-white/10 bg-black/30 p-4 xl:block">
          <figure className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-sm)]">
            <Image
              src={movie.posterUrl}
              alt={movie.title}
              fill
              sizes="300px"
              className="object-cover"
            />
          </figure>
          <div className="space-y-2 p-3">
            <p className="text-xl font-semibold">{movie.title}</p>
            <p className="text-sm text-white/70">{movie.genres.join(" • ")}</p>
            <p className="text-sm text-white/70">{movie.tagline}</p>
          </div>
        </aside>
      </figcaption>
    </figure>
  </section>
);
