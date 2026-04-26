"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { MovieSummary } from "@/types/storefront";
import { MovieCard } from "@/components/cinema/movie-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip-toggle";
import { copy } from "@/lib/copy/catalog";

const PAGE_SIZE = 4;

export const MovieBrowser = ({
  citySlug,
  movies,
  tenantSlug,
}: {
  citySlug: string;
  movies: MovieSummary[];
  tenantSlug?: string;
}) => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"todos" | MovieSummary["status"]>("todos");
  const [activeGenre, setActiveGenre] = useState<string>("Todos");
  const [activeFormat, setActiveFormat] = useState<string>("Todos");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const deferredQuery = useDeferredValue(query);

  const genres = useMemo(
    () => ["Todos", ...Array.from(new Set(movies.flatMap((movie) => movie.genres)))],
    [movies],
  );
  const formats = useMemo(
    () => ["Todos", ...Array.from(new Set(movies.flatMap((movie) => movie.formats)))],
    [movies],
  );

  const filteredMovies = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();

    return movies.filter((movie) => {
      const matchesQuery =
        !normalized ||
        movie.title.toLowerCase().includes(normalized) ||
        movie.genres.join(" ").toLowerCase().includes(normalized) ||
        movie.formats.join(" ").toLowerCase().includes(normalized);
      const matchesStatus = status === "todos" || movie.status === status;
      const matchesGenre = activeGenre === "Todos" || movie.genres.includes(activeGenre);
      const matchesFormat = activeFormat === "Todos" || movie.formats.includes(activeFormat);

      return matchesQuery && matchesStatus && matchesGenre && matchesFormat;
    });
  }, [activeFormat, activeGenre, deferredQuery, movies, status]);

  const visibleMovies = filteredMovies.slice(0, visibleCount);

  return (
    <section className="space-y-8">
      <section className="rounded-[var(--radius-md)] border border-border bg-surface p-5" aria-label="Filtros de catálogo">
        <div className="grid gap-4">
          <Input
            aria-label="Filtrar filmes"
            value={query}
            onChange={(event) => {
              setVisibleCount(PAGE_SIZE);
              setQuery(event.target.value);
            }}
            placeholder={copy("movieBrowserSearchPlaceholder")}
          />
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">{copy("movieBrowserStatusLegend")}</legend>
            <ul className="flex flex-wrap gap-2">
                {[
                  { label: copy("movieBrowserStatusAll"), value: "todos" },
                  { label: copy("movieBrowserStatusNowShowing"), value: "em-cartaz" },
                  { label: copy("movieBrowserStatusComingSoon"), value: "em-breve" },
                ].map((item) => (
                  <li key={item.value}>
                    <ChipToggle
                      key={item.value}
                      onClick={() => setStatus(item.value as typeof status)}
                      active={status === item.value}
                    >
                      {item.label}
                    </ChipToggle>
                  </li>
                ))}
            </ul>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">{copy("movieBrowserGenreLegend")}</legend>
            <ul className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <li key={genre}>
                  <ChipToggle onClick={() => setActiveGenre(genre)} active={activeGenre === genre}>
                    {genre}
                  </ChipToggle>
                </li>
              ))}
            </ul>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">{copy("movieBrowserFormatLegend")}</legend>
            <ul className="flex flex-wrap gap-2">
              {formats.map((format) => (
                <li key={format}>
                  <ChipToggle onClick={() => setActiveFormat(format)} active={activeFormat === format}>
                    {format}
                  </ChipToggle>
                </li>
              ))}
            </ul>
          </fieldset>
        </div>
      </section>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5" aria-label="Resultados do catálogo de filmes">
        {visibleMovies.map((movie) => (
          <li key={movie.id} className="h-full">
            <MovieCard citySlug={citySlug} movie={movie} tenantSlug={tenantSlug} />
          </li>
        ))}
      </ul>
      {filteredMovies.length > visibleCount ? (
        <div className="flex justify-center">
          <Button
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            variant="secondary"
            size="md"
          >
            {copy("movieBrowserLoadMore")}
          </Button>
        </div>
      ) : null}
    </section>
  );
};
