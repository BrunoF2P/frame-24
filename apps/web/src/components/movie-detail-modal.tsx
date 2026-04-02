"use client";

import { X, Calendar, Clock, MapPin, Film, Info } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface MovieCategory {
  name: string;
}

interface AgeRating {
  code: string;
}

interface MovieCast {
  id: string;
  photo_url?: string | null;
  artist_name: string;
  character_name?: string | null;
}

interface MovieMedia {
  media_url?: string | null;
}

interface Movie {
  brazil_title?: string | null;
  original_title?: string | null;
  movie_media?: MovieMedia[];
  age_rating?: AgeRating | null;
  duration_minutes?: number | null;
  categories?: MovieCategory[];
  synopsis?: string | null;
  movie_cast?: MovieCast[];
}

interface Showtime {
  id: string;
  start_time: string | Date;
  cinema_complexes: {
    name: string;
  };
  projection_types?: {
    name?: string | null;
  } | null;
  audio_types?: {
    name?: string | null;
  } | null;
}

interface MovieDetailModalProps {
  movie: Movie;
  showtimes: Showtime[];
  onClose: () => void;
  tenantSlug: string;
  isLoading?: boolean;
}

export function MovieDetailModal({
  movie,
  showtimes,
  onClose,
  tenantSlug,
  isLoading,
}: MovieDetailModalProps) {
  const router = useRouter();
  const posterUrl = movie.movie_media?.[0]?.media_url;

  // Agrupar sessões por cinema
  const showtimesByCinema = showtimes.reduce<Record<string, Showtime[]>>(
    (acc, showtime) => {
    const cinemaName = showtime.cinema_complexes.name;
    if (!acc[cinemaName]) {
      acc[cinemaName] = [];
    }
    acc[cinemaName].push(showtime);
    return acc;
    },
    {},
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-4xl bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] border border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Movie Poster Side */}
        <div className="w-full md:w-2/5 relative h-64 md:h-auto bg-zinc-950">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={movie.brazil_title || movie.original_title || "Poster do filme"}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600">
              <Film className="w-16 h-16 opacity-20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent md:bg-gradient-to-r" />
        </div>

        {/* Details Side */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-3xl font-bold text-white leading-tight">
                {movie.brazil_title || movie.original_title}
              </h2>
              {movie.age_rating && (
                <div
                  className={`
                                    px-3 py-1 rounded-md font-bold text-sm whitespace-nowrap
                                    ${
                                      movie.age_rating.code === "L"
                                        ? "bg-green-500 text-white"
                                        : movie.age_rating.code === "10"
                                          ? "bg-blue-500 text-white"
                                          : movie.age_rating.code === "12"
                                            ? "bg-yellow-500 text-black"
                                            : movie.age_rating.code === "14"
                                              ? "bg-orange-500 text-white"
                                              : movie.age_rating.code === "16"
                                                ? "bg-red-500 text-white"
                                                : "bg-black text-white border border-zinc-700"
                                    }
                                `}
                >
                  {movie.age_rating.code === "L"
                    ? "LIVRE"
                    : `${movie.age_rating.code} ANOS`}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 text-sm text-zinc-400 mb-4">
              {movie.duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {movie.duration_minutes} min
                </span>
              )}
              {movie.categories && movie.categories.length > 0 && (
                <>
                  <span>•</span>
                  <span>
                    {movie.categories.map((c) => c.name).join(", ")}
                  </span>
                </>
              )}
            </div>

            {movie.synopsis && (
              <p className="text-zinc-300 text-sm leading-relaxed line-clamp-4 hover:line-clamp-none transition-all">
                {movie.synopsis}
              </p>
            )}

            {/* Cast */}
            {movie.movie_cast && movie.movie_cast.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">
                  Elenco
                </h3>
                <div className="flex flex-wrap gap-4">
                  {movie.movie_cast.map((cast) => (
                    <div
                      key={cast.id}
                      className="flex items-center gap-3 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50 min-w-[200px]"
                    >
                      <div className="w-10 h-10 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
                        {cast.photo_url ? (
                          <Image
                            src={cast.photo_url}
                            alt={cast.artist_name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs font-bold">
                            {cast.artist_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {cast.artist_name}
                        </div>
                        {cast.character_name && (
                          <div className="text-xs text-zinc-500">
                            {cast.character_name}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Showtimes */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-500" />
              Sessões Disponíveis
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
              </div>
            ) : showtimes.length === 0 ? (
              <div className="text-center py-8 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                <Info className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-400">
                  Nenhuma sessão disponível para a data selecionada.
                </p>
              </div>
            ) : (
              Object.entries(showtimesByCinema).map(
                ([cinemaName, sessions]) => (
                  <div key={cinemaName} className="space-y-3">
                    <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
                      <MapPin className="w-4 h-4" />
                      {cinemaName}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {sessions.map((session) => (
                        <button
                          key={session.id}
                          onClick={() =>
                            router.push(`/${tenantSlug}/showtime/${session.id}`)
                          }
                          className="group flex flex-col items-center p-3 bg-zinc-950 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/50 rounded-xl transition-all duration-200"
                        >
                          <span className="text-lg font-bold text-white group-hover:text-red-500 transition-colors">
                            {format(new Date(session.start_time), "HH:mm")}
                          </span>
                          <div className="flex flex-col items-center text-[10px] text-zinc-500 uppercase font-medium mt-1 gap-0.5">
                            <span>
                              {session.projection_types?.name || "2D"}
                            </span>
                            <span>{session.audio_types?.name || "LEG"}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
