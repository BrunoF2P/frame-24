"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import { useShowtimes } from "@/hooks/use-showtimes";
import { format, isToday, isTomorrow, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, MapPin, Film, ArrowLeft } from "lucide-react";

interface MediaItem {
  media_url?: string;
  media_types?: {
    name?: string;
  };
}

interface MovieCast {
  id: string;
  photo_url?: string;
  artist_name: string;
  character_name?: string;
}

interface MovieDetails {
  brazil_title?: string;
  original_title?: string;
  age_rating?: { code?: string };
  duration_minutes?: number;
  category_links?: Array<{ category: { name: string } }>;
  synopsis?: string;
  movie_cast?: MovieCast[];
  movie_media?: MediaItem[];
}

interface ShowtimeItem {
  id: string;
  start_time: string;
  cinema_complexes: { name: string };
  projection_types?: { name?: string };
  audio_types?: { name?: string };
}

export default function MovieDetailPage({
  params,
}: {
  params: Promise<{ tenant_slug: string; id: string }>;
}) {
  const { tenant_slug, id } = use(params);
  const router = useRouter();
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: showtimes, isLoading: showtimesLoading } = useShowtimes({
    tenantSlug: tenant_slug,
    movieId: id,
  });

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const response = await api.get(`/public/movies/${id}`);
        setMovie(response.data);
      } catch {
        setMovie(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Filme não encontrado</h1>
        <button
          onClick={() => router.push(`/${tenant_slug}`)}
          className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  const posterUrl =
    movie.movie_media?.find((m) => m.media_types?.name === "Poster")
      ?.media_url || movie.movie_media?.[0]?.media_url;
  // Use backdrop if available, otherwise fallback to poster or placeholder
  const backdropUrl =
    movie.movie_media?.find((m) => m.media_types?.name === "Backdrop")
      ?.media_url || posterUrl;

  // Group showtimes by date, then by cinema
  const showtimesByDate = ((showtimes ?? []) as ShowtimeItem[]).reduce<
    Record<string, Record<string, ShowtimeItem[]>>
  >((acc, showtime) => {
      const date = startOfDay(parseISO(showtime.start_time)).toISOString();
      if (!acc[date]) {
        acc[date] = {};
      }
      const cinemaName = showtime.cinema_complexes.name;
      if (!acc[date][cinemaName]) {
        acc[date][cinemaName] = [];
      }
      acc[date][cinemaName].push(showtime);
      return acc;
    }, {});

  const getDateLabel = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Hero / Backdrop */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        {backdropUrl ? (
          <Image
            src={backdropUrl}
            alt={movie.brazil_title || movie.original_title || "Backdrop"}
            fill
            sizes="100vw"
            className="object-cover opacity-50"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />

        <button
          onClick={() => router.push(`/${tenant_slug}`)}
          className="absolute top-6 left-6 z-10 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all group"
        >
          <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="w-48 md:w-72 flex-shrink-0 mx-auto md:mx-0 rounded-xl overflow-hidden shadow-2xl border-4 border-zinc-900">
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={movie.brazil_title || movie.original_title || "Poster"}
                width={288}
                height={432}
                className="w-full h-auto object-cover aspect-[2/3]"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center aspect-[2/3]">
                <Film className="w-16 h-16 opacity-20" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 pt-4 md:pt-12 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              {movie.brazil_title || movie.original_title}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm md:text-base text-zinc-300 mb-6">
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
              {movie.duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {movie.duration_minutes} min
                </span>
              )}
              {movie.category_links && movie.category_links.length > 0 && (
                <>
                  <span className="hidden md:inline">•</span>
                  <span>
                    {movie.category_links
                      .map((l) => l.category.name)
                      .join(", ")}
                  </span>
                </>
              )}
            </div>

            {movie.synopsis && (
              <p className="text-zinc-300 text-lg leading-relaxed max-w-3xl mb-8">
                {movie.synopsis}
              </p>
            )}

            {/* Cast */}
            {movie.movie_cast && movie.movie_cast.length > 0 && (
              <div className="mb-12">
                <h3 className="text-sm font-bold text-zinc-500 mb-4 uppercase tracking-wider">
                  Elenco Principal
                </h3>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                  {movie.movie_cast.slice(0, 6).map((cast) => (
                    <div
                      key={cast.id}
                      className="flex items-center gap-3 bg-zinc-900/50 p-2 pr-4 rounded-full border border-zinc-800/50"
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
                      <div className="text-left">
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
        </div>

        {/* Showtimes Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-red-500" />
            Sessões Disponíveis
          </h2>

          {showtimesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
            </div>
          ) : (showtimes || []).length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <p className="text-zinc-400">Nenhuma sessão disponível.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(showtimesByDate).map(
                ([dateString, cinemas]) => (
                  <div key={dateString} className="space-y-4">
                    <h3 className="text-xl font-bold capitalize text-red-500 sticky top-16 bg-zinc-950 py-2 z-10">
                      {getDateLabel(dateString)}
                    </h3>
                    <div className="grid gap-6">
                      {Object.entries(cinemas).map(
                        ([cinemaName, sessions]) => (
                          <div
                            key={cinemaName}
                            className="bg-zinc-900 rounded-xl p-6 border border-zinc-800"
                          >
                            <div className="flex items-center gap-2 text-zinc-400 font-medium mb-4">
                              <MapPin className="w-5 h-5" />
                              {cinemaName}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                              {sessions.map((session) => (
                                <button
                                  key={session.id}
                                  onClick={() =>
                                    router.push(
                                      `/${tenant_slug}/showtime/${session.id}`,
                                    )
                                  }
                                  className="group flex flex-col items-center p-4 bg-zinc-950 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/50 rounded-xl transition-all duration-200"
                                >
                                  <span className="text-xl font-bold text-white group-hover:text-red-500 transition-colors">
                                    {format(
                                      new Date(session.start_time),
                                      "HH:mm",
                                    )}
                                  </span>
                                  <div className="flex flex-col items-center text-xs text-zinc-500 uppercase font-medium mt-1 gap-0.5">
                                    <span>
                                      {session.projection_types?.name || "2D"}
                                    </span>
                                    <span>
                                      {session.audio_types?.name || "LEG"}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
