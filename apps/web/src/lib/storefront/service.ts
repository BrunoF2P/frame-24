import { getTenantSlugFromPathname } from "@/lib/tenant-routing";
import { buildShowtimeSlug, isShowtimeUuid } from "@/lib/showtime-routing";
import {
  getTenantCinemas,
  getTenantCity,
  getTenantCities,
  getTenantMovie,
  getTenantMovies,
  getTenantPaymentMethods,
  getTenantProducts,
  getTenantSaleByReference,
  getTenantSearch,
  getTenantShowtimeSeats,
  getTenantShowtimes,
  getTenantTicketTypes,
  toMovie,
} from "@/lib/storefront/api";
import { publicApi } from "@/lib/api-client";
import { unique } from "@/lib/utils";
import type {
  CheckoutSummary,
  Cinema,
  City,
  ConcessionProduct,
  LoyaltyState,
  MovieSessionStats,
  MovieSummary,
  RuleValidationResult,
  SearchItem,
  SeatKind,
  SessionGroup,
  TicketSelectionState,
  TicketType,
} from "@/types/storefront";

const fallbackLoyaltyState: LoyaltyState = {
  tier: "Club",
  points: 0,
  perks: [],
};

const resolveTenant = (tenantSlug?: string) => {
  if (tenantSlug) {
    return tenantSlug;
  }

  if (typeof window !== "undefined") {
    return getTenantSlugFromPathname(window.location.pathname);
  }

  return null;
};

const requireTenant = (tenantSlug?: string) => {
  const resolved = resolveTenant(tenantSlug);
  if (!resolved) {
    throw new Error("Tenant não resolvido para a vitrine pública.");
  }
  return resolved;
};

const toTicketTypeMap = (
  items: Array<TicketType & { id?: string; priceModifier?: number }>,
) =>
  items.map((item) => ({
    ...item,
    seatConstraints: {
      allowedSeatKinds:
        item.code === "meia_pcd"
          ? (["wheelchair"] satisfies SeatKind[])
          : item.code === "acompanhante_pcd"
            ? (["companion"] satisfies SeatKind[])
            : undefined,
      blockedSeatKinds:
        item.code === "inteira"
          ? (["wheelchair", "companion"] satisfies SeatKind[])
          : undefined,
    },
  }));

export const getCities = async (tenantSlug?: string): Promise<City[]> =>
  getTenantCities(requireTenant(tenantSlug));

export const getDefaultCity = async (tenantSlug?: string) =>
  (await getCities(tenantSlug))[0] ?? null;

export const getCityBySlug = async (slug: string, tenantSlug?: string) =>
  getTenantCity(requireTenant(tenantSlug), slug);

export const getMoviesForCity = async (
  citySlug: string,
  status?: MovieSummary["status"],
  tenantSlug?: string,
) => getTenantMovies(requireTenant(tenantSlug), citySlug, status);

export const getFeaturedMovieForCity = async (citySlug: string, tenantSlug?: string) =>
  (await getMoviesForCity(citySlug, "em-cartaz", tenantSlug)).sort(
    (left, right) => right.recommendationScore - left.recommendationScore,
  )[0] ?? null;

export const getMovieBySlug = async (
  citySlug: string,
  movieSlug: string,
  tenantSlug?: string,
) => getTenantMovie(requireTenant(tenantSlug), citySlug, movieSlug);

export const getMovieById = async (movieId: string, tenantSlug?: string) => {
  const resolvedTenant = requireTenant(tenantSlug);
  const response = await publicApi.publicControllerGetMoviesV1({
    tenantSlug: resolvedTenant,
  });
  const movie = (Array.isArray(response.data) ? response.data : []).find((item) => {
    return item && typeof item === "object" && "id" in item && item.id === movieId;
  });

  return movie ? toMovie(movie) : null;
};

export const getCinemasForCity = async (citySlug: string, tenantSlug?: string) =>
  getTenantCinemas(requireTenant(tenantSlug), citySlug);

export const getCinemaBySlug = async (cinemaSlug: string, tenantSlug?: string) => {
  const resolvedTenant = requireTenant(tenantSlug);
  const cities = await getTenantCities(resolvedTenant);
  for (const city of cities) {
    const cinemas = await getTenantCinemas(resolvedTenant, city.slug);
    const matched = cinemas.find((cinema) => cinema.slug === cinemaSlug);
    if (matched) {
      return matched;
    }
  }

  return null;
};

export const getSessionById = async (sessionId: string, tenantSlug?: string) => {
  const resolvedTenant = requireTenant(tenantSlug);
  const seatMap = await getTenantShowtimeSeats(sessionId).catch(() => null);
  if (!seatMap) {
    return null;
  }

  const sessions = await getTenantShowtimes(resolvedTenant);
  const session = sessions.find((item) => item.id === sessionId);

  if (!session) {
    return null;
  }

  return {
    ...session,
    seats: seatMap.seats,
  } satisfies SessionGroup;
};

export const getSessionByReference = async (
  reference: string,
  citySlug: string,
  tenantSlug?: string,
) => {
  if (isShowtimeUuid(reference)) {
    return getSessionById(reference, tenantSlug);
  }

  const [sessions, movies, cinemas] = await Promise.all([
    getSessionsForCity(citySlug, undefined, tenantSlug),
    getMoviesForCity(citySlug, undefined, tenantSlug),
    getCinemasForCity(citySlug, tenantSlug),
  ]);

  const matched = sessions.find((session) => {
    const movie = movies.find((item) => item.id === session.movieId);
    const cinema = cinemas.find((item) => item.id === session.cinemaId);
    if (!movie || !cinema) {
      return false;
    }

    return (
      buildShowtimeSlug({
        movieSlug: movie.slug,
        cinemaSlug: cinema.slug,
        date: session.date,
        time: session.time,
        room: session.room,
      }) === reference
    );
  });

  return matched ? getSessionById(matched.id, tenantSlug) : null;
};

export const getSessionsForCity = async (
  citySlug: string,
  filters?: { movieId?: string; cinemaId?: string },
  tenantSlug?: string,
) =>
  (await getTenantShowtimes(requireTenant(tenantSlug), {
    movieId: filters?.movieId,
  })).filter(
    (session) =>
      session.citySlug === citySlug &&
      (!filters?.movieId || session.movieId === filters.movieId) &&
      (!filters?.cinemaId || session.cinemaId === filters.cinemaId),
  );

export const getSessionsForMovie = async (
  citySlug: string,
  movieId: string,
  tenantSlug?: string,
) => getSessionsForCity(citySlug, { movieId }, tenantSlug);

export const getCinemasForMovie = async (
  citySlug: string,
  movieId: string,
  tenantSlug?: string,
): Promise<Cinema[]> => {
  const cityCinemas = await getCinemasForCity(citySlug, tenantSlug);
  const sessionCinemaIds = unique(
    (await getSessionsForMovie(citySlug, movieId, tenantSlug)).map((session) => session.cinemaId),
  );
  return cityCinemas.filter((cinema) => sessionCinemaIds.includes(cinema.id));
};

export const getConcessions = async (
  tenantSlug?: string,
  complexId?: string,
): Promise<ConcessionProduct[]> =>
  getTenantProducts(requireTenant(tenantSlug), complexId);

export const getTicketTypesForSession = async (
  _citySlug: string,
  _cinemaId: string,
  _sessionId: string,
  tenantSlug?: string,
) => toTicketTypeMap(await getTenantTicketTypes(requireTenant(tenantSlug)));

export const getPaymentMethods = async (tenantSlug?: string) =>
  getTenantPaymentMethods(requireTenant(tenantSlug));

export const getRoomLayoutForSession = async () => null;

export const validateSeatAndTicketSelection = async (
  _citySlug: string,
  _cinemaId: string,
  _sessionId: string,
  ticketSelection: TicketSelectionState,
  seats: string[],
): Promise<RuleValidationResult> => {
  const totalTickets = Object.values(ticketSelection.tickets).reduce(
    (sum, quantity) => sum + (quantity ?? 0),
    0,
  );
  const errors: string[] = [];

  if (totalTickets === 0) {
    errors.push("Escolha ao menos um ingresso.");
  }
  if (seats.length !== totalTickets) {
    errors.push("A quantidade de assentos deve bater com os ingressos.");
  }
  if (ticketSelection.fiscalCpf && ticketSelection.fiscalCpf.replace(/\D/g, "").length !== 11) {
    errors.push("Informe um CPF válido.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
    recommendedActions: [],
  };
};

export const getLoyaltyState = async () => fallbackLoyaltyState;

export const getPurchaseHistory = async () => [];

export const getMovieSessionStatsForCity = async (citySlug: string, tenantSlug?: string) => {
  const citySessions = await getSessionsForCity(citySlug, undefined, tenantSlug);

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

    acc[movieId] = {
      sessionCount: movieSessions.length,
      priceFrom: Math.min(...movieSessions.map((session) => session.priceFrom)),
      nextSessionLabel: nextSession
        ? `${nextSession.date.split("-").reverse().join("/")} • ${nextSession.time}`
        : undefined,
      exhibitionLabel: hasDubbed && hasSubtitles
        ? "Dublado e legendado"
        : hasDubbed
          ? "Dublado"
          : hasSubtitles
            ? "Legendado"
            : movieSessions[0]?.language ?? "Consulte sessões",
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
  tenantSlug?: string,
): Promise<SearchItem[]> => {
  const resolvedTenant = resolveTenant(tenantSlug);
  if (!resolvedTenant) {
    return [];
  }

  return getTenantSearch(resolvedTenant, query, citySlug);
};

export const getSaleDetails = async (reference: string, tenantSlug?: string) =>
  getTenantSaleByReference(requireTenant(tenantSlug), reference);
