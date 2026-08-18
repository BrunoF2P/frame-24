import { MovieCard } from "@/components/cinema/movie-card";
import type { MovieSummary } from "@/types/storefront";

export const ComingSoonRail = ({
  citySlug,
  movies,
  tenantSlug,
}: {
  citySlug: string;
  movies: MovieSummary[];
  tenantSlug?: string;
}) => (
  <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5" aria-label="Filmes em pré-estreia e em breve">
    {movies.map((movie) => (
      <li key={movie.id} className="h-full">
        <MovieCard citySlug={citySlug} movie={movie} tenantSlug={tenantSlug} />
      </li>
    ))}
  </ul>
);
