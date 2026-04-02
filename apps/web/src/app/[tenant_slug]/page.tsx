"use client";

import { useMovies } from "@/hooks/use-movies";
import { useFilters } from "@/store/use-filters";
import { use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Movie {
  id: string;
  brazil_title?: string | null;
  original_title: string;
  duration_minutes?: number;
  age_rating?: { code: string } | null;
  movie_media?: Array<{ media_url: string }>;
  synopsis?: string;
  categories?: Array<{ name: string }>;
  movie_cast?: Array<{
    id: string;
    artist_name: string;
    character_name?: string;
    photo_url?: string;
  }>;
}

export default function TenantPage({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}) {
  const { tenant_slug } = use(params);
  const router = useRouter();
  const { data: movies, isLoading: moviesLoading } = useMovies(tenant_slug);
  const { selectedComplexId } = useFilters();

  const moviesList = (movies as unknown as Movie[]) || [];

  if (moviesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white text-xl">Carregando filmes...</div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Filmes em Cartaz</h1>
        <p className="text-zinc-400">
          {selectedComplexId
            ? "Filtrado por cinema selecionado"
            : "Mostrando todos os cinemas"}
        </p>
      </div>

      {/* Grid de Filmes */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-12">
        {moviesList.map((movie) => {
          const posterUrl = movie.movie_media?.[0]?.media_url;

          return (
            <button
              key={movie.id}
              onClick={() => router.push(`/${tenant_slug}/movie/${movie.id}`)}
              className="group relative rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:ring-2 hover:ring-red-500"
            >
              {/* Poster */}
              <div className="aspect-[2/3] bg-zinc-900 relative">
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={movie.brazil_title || movie.original_title}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 20vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    Sem Poster
                  </div>
                )}

                {/* Classificação */}
                {movie.age_rating && (
                  <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-bold text-white">
                    {movie.age_rating.code}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
                <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">
                  {movie.brazil_title || movie.original_title}
                </h3>
                {movie.duration_minutes && (
                  <p className="text-zinc-400 text-xs">
                    {movie.duration_minutes} min
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
}
