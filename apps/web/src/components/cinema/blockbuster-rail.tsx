import Image from "next/image";
import Link from "next/link";
import type { MovieSummary } from "@/types/storefront";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

export const BlockbusterRail = ({
  citySlug,
  movies,
}: {
  citySlug: string;
  movies: MovieSummary[];
}) => (
  <ul className="grid gap-4 lg:grid-cols-3" aria-label="Blockbusters em alta">
    {movies.map((movie) => (
      <li key={movie.id}>
        <article className="group overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-black text-white shadow-[0_12px_28px_rgba(0,0,0,0.24)]">
          <Link className="block" href={`/cidade/${citySlug}/filme/${movie.slug}`}>
            <figure className="relative aspect-[16/9]">
              <Image
                src={movie.backdropUrl}
                alt={movie.title}
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />
              <figcaption className="absolute inset-x-0 bottom-0 space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent">Blockbuster</Badge>
                  <Badge variant={movie.status === "em-breve" ? "gold" : "neutral"}>
                    {movie.status === "em-breve" ? "Pré-estreia" : "Em cartaz"}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-2xl font-semibold leading-tight">{movie.title}</p>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent-red-200">
                  <Icon name="ticket" size="xs" />
                  Ver horários
                </p>
              </figcaption>
            </figure>
          </Link>
        </article>
      </li>
    ))}
  </ul>
);
