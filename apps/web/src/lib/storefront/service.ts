import {
  cinemas,
  cities,
  concessions,
  loyaltyState,
  movies,
  purchaseHistory,
  sessions,
} from "@/lib/storefront/data";
import {
  getRoomLayoutForSession as getRoomLayoutForSessionModel,
  getTicketTypesForSession as getTicketTypesForSessionModel,
  validateSeatAndTicketSelection as validateSeatAndTicketSelectionModel,
} from "@/lib/storefront/rule-engine";
import { slugify, unique } from "@/lib/utils";
import type {
  CheckoutSummary,
  Cinema,
  City,
  ConcessionProduct,
  MovieSessionStats,
  MovieSummary,
  RuleValidationResult,
  SearchItem,
  SessionGroup,
  TicketSelectionState,
} from "@/types/storefront";

const pick = <T,>(value: T | undefined, fallback: T) => value ?? fallback;
const withRoomLayout = (session: SessionGroup): SessionGroup => ({
  ...session,
  roomLayout: session.roomLayout ?? getRoomLayoutForSessionModel(session.id),
});

export const getCities = async (): Promise<City[]> => cities;

export const getDefaultCity = async () => cities[0];

export const getCityBySlug = async (slug: string) =>
  cities.find((city) => city.slug === slug) ?? null;

export const getMoviesForCity = async (citySlug: string, status?: MovieSummary["status"]) =>
  movies.filter(
    (movie) =>
      movie.citySlugs.includes(citySlug) && (status ? movie.status === status : true),
  );

export const getFeaturedMovieForCity = async (citySlug: string) =>
  (await getMoviesForCity(citySlug, "em-cartaz")).sort(
    (left, right) => right.recommendationScore - left.recommendationScore,
  )[0] ?? null;

export const getMovieBySlug = async (citySlug: string, movieSlug: string) =>
  movies.find((movie) => movie.slug === movieSlug && movie.citySlugs.includes(citySlug)) ?? null;

export const getMovieById = async (movieId: string) =>
  movies.find((movie) => movie.id === movieId) ?? null;

export const getCinemasForCity = async (citySlug: string) =>
  cinemas.filter((cinema) => cinema.citySlug === citySlug);

export const getCinemaBySlug = async (cinemaSlug: string) =>
  cinemas.find((cinema) => cinema.slug === cinemaSlug) ?? null;

export const getSessionById = async (sessionId: string) =>
  {
    const session = sessions.find((item) => item.id === sessionId);
    return session ? withRoomLayout(session) : null;
  };

export const getSessionsForCity = async (citySlug: string, filters?: { movieId?: string; cinemaId?: string }) =>
  sessions
    .filter(
      (session) =>
        session.citySlug === citySlug &&
        pick(session.movieId === filters?.movieId, true) &&
        pick(session.cinemaId === filters?.cinemaId, true),
    )
    .map(withRoomLayout);

export const getSessionsForMovie = async (citySlug: string, movieId: string) =>
  getSessionsForCity(citySlug, { movieId });

export const getCinemasForMovie = async (citySlug: string, movieId: string): Promise<Cinema[]> => {
  const sessionCinemaIds = unique((await getSessionsForMovie(citySlug, movieId)).map((session) => session.cinemaId));
  return cinemas.filter((cinema) => sessionCinemaIds.includes(cinema.id));
};

export const getConcessions = async (): Promise<ConcessionProduct[]> => concessions;

export const getTicketTypesForSession = async (
  citySlug: string,
  cinemaId: string,
  sessionId: string,
) => getTicketTypesForSessionModel(citySlug, cinemaId, sessionId);

export const getRoomLayoutForSession = async (sessionId: string) =>
  getRoomLayoutForSessionModel(sessionId);

export const validateSeatAndTicketSelection = async (
  citySlug: string,
  cinemaId: string,
  sessionId: string,
  ticketSelection: TicketSelectionState,
  seats: string[],
): Promise<RuleValidationResult> =>
  validateSeatAndTicketSelectionModel(citySlug, cinemaId, sessionId, ticketSelection, seats);

export const getLoyaltyState = async () => loyaltyState;

export const getPurchaseHistory = async () => purchaseHistory;

export const getMovieSessionStatsForCity = async (citySlug: string) => {
  const citySessions = await getSessionsForCity(citySlug);

  const grouped = citySessions.reduce<Record<string, SessionGroup[]>>((acc, session) => {
    const sessionsByMovie = acc[session.movieId] ?? [];
    sessionsByMovie.push(session);
    acc[session.movieId] = sessionsByMovie;
    return acc;
  }, {});

  return Object.entries(grouped).reduce<Record<string, MovieSessionStats>>((acc, [movieId, movieSessions]) => {
    const sortedByDate = [...movieSessions].sort((left, right) => {
      const leftStamp = new Date(`${left.date}T${left.time}:00`).getTime();
      const rightStamp = new Date(`${right.date}T${right.time}:00`).getTime();
      return leftStamp - rightStamp;
    });
    const nextSession = sortedByDate[0];
    const hasDubbed = movieSessions.some((session) =>
      session.language.toLowerCase().includes("dublado"),
    );
    const hasSubtitles = movieSessions.some(
      (session) => session.subtitle.toLowerCase() !== "sem legenda",
    );

    const exhibitionLabel = hasDubbed && hasSubtitles
      ? "Dublado e legendado"
      : hasDubbed
        ? "Dublado"
        : hasSubtitles
          ? "Legendado"
          : movieSessions[0]?.language ?? "Consulte sessões";
    const nextSessionLabel = nextSession
      ? `${nextSession.date.split("-").reverse().join("/")} • ${nextSession.time}`
      : undefined;

    acc[movieId] = {
      sessionCount: movieSessions.length,
      priceFrom: Math.min(...movieSessions.map((session) => session.priceFrom)),
      nextSessionLabel,
      exhibitionLabel,
    };

    return acc;
  }, {});
};

export const buildCheckoutSummary = async (checkoutId: string): Promise<CheckoutSummary | null> => {
  const session = await getSessionById(checkoutId);

  if (!session) {
    return null;
  }

  return {
    id: checkoutId,
    sessionId: session.id,
    citySlug: session.citySlug,
    seatIds: [],
    products: [],
  };
};

export const searchStorefront = async (
  query: string,
  citySlug?: string,
): Promise<SearchItem[]> => {
  const normalized = slugify(query);
  const fallbackMovie = movies[0];
  const fallbackCinema = cinemas[0];
  const fallbackCity = cities[0];

  if (!normalized && fallbackMovie && fallbackCinema && fallbackCity) {
    return [
      {
        id: fallbackMovie.id,
        type: "movie",
        title: fallbackMovie.title,
        subtitle: "Sessões de hoje e formatos premium",
        href: `/cidade/${fallbackMovie.citySlugs[0]}/filme/${fallbackMovie.slug}`,
      },
      {
        id: fallbackCinema.id,
        type: "cinema",
        title: fallbackCinema.name,
        subtitle: `${fallbackCinema.network} • ${fallbackCinema.neighborhood}`,
        href: `/cinema/${fallbackCinema.slug}`,
      },
      {
        id: fallbackCity.id,
        type: "city",
        title: fallbackCity.name,
        subtitle: `${fallbackCity.state} • Em cartaz agora`,
        href: `/cidade/${fallbackCity.slug}`,
      },
    ];
  }

  if (!normalized) {
    return [];
  }

  const movieHits: SearchItem[] = movies
    .filter(
      (movie) =>
        slugify(movie.title).includes(normalized) &&
        (citySlug ? movie.citySlugs.includes(citySlug) : true),
    )
    .map((movie) => ({
      id: movie.id,
      type: "movie",
      title: movie.title,
      subtitle: movie.tagline,
      href: `/cidade/${movie.citySlugs[0]}/filme/${movie.slug}`,
    }));

  const cinemaHits: SearchItem[] = cinemas
    .filter(
      (cinema) =>
        slugify(cinema.name).includes(normalized) &&
        (citySlug ? cinema.citySlug === citySlug : true),
    )
    .map((cinema) => ({
      id: cinema.id,
      type: "cinema",
      title: cinema.name,
      subtitle: `${cinema.network} • ${cinema.neighborhood}`,
      href: `/cinema/${cinema.slug}`,
    }));

  const cityHits: SearchItem[] = cities
    .filter((city) => slugify(city.name).includes(normalized))
    .map((city) => ({
      id: city.id,
      type: "city",
      title: city.name,
      subtitle: `${city.state} • ${city.heroLabel}`,
      href: `/cidade/${city.slug}`,
    }));

  return [...movieHits, ...cinemaHits, ...cityHits].slice(0, 8);
};
