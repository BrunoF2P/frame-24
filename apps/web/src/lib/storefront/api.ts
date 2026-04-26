import { publicApi } from "@/lib/api-client";
import { DEFAULT_APP_TIMEZONE, formatDateInTimeZone, formatTimeInTimeZone } from "@/lib/utils";
import type {
  Cinema,
  City,
  ConcessionProduct,
  MovieSummary,
  SearchItem,
  SeatKind,
  SeatNode,
  SessionGroup,
  TicketType,
  TicketTypeCode,
} from "@/types/storefront";

export interface TenantCompanySummary {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
}

type ApiRecord = Record<string, unknown>;

const asRecord = (value: unknown): ApiRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as ApiRecord) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const dateFromIso = (value: unknown, timeZone = DEFAULT_APP_TIMEZONE) => {
  const raw = asString(value);
  if (!raw) return "";
  return formatDateInTimeZone(raw, timeZone, "en-CA");
};

const timeFromIso = (value: unknown, timeZone = DEFAULT_APP_TIMEZONE) => {
  const raw = asString(value);
  if (!raw) return "";
  return formatTimeInTimeZone(raw, timeZone);
};

const mapSeatStatus = (seat: ApiRecord): SeatNode["status"] => {
  const status = asString(seat.status).toLowerCase();
  if (status.includes("vend") || status.includes("sold")) return "sold";
  if (status.includes("reserv") || Boolean(seat.reserved)) return "held";
  if (status.includes("bloq")) return "sold";
  return "available";
};

const mapSeatKind = (value: unknown): SeatKind => {
  const raw = asString(value, "standard") as SeatKind;
  return raw || "standard";
};

export const toCity = (input: unknown): City => {
  const city = asRecord(input);
  const name = asString(city.name, asString(city.city, "Cidade"));
  const state = asString(city.state, "");
  return {
    id: asString(city.id, `${state}:${asString(city.slug, name)}`),
    slug: asString(city.slug, asString(city.city_slug, name.toLowerCase())),
    name,
    state,
    heroLabel: `${name}, ${state}`,
    intro: `Filmes e sessões disponíveis em ${name}.`,
    timezone: asString(city.timezone, "America/Bahia"),
  };
};

export const toCinema = (input: unknown): Cinema => {
  const cinema = asRecord(input);
  return {
    id: asString(cinema.id),
    slug: asString(cinema.slug, asString(cinema.id)),
    name: asString(cinema.name, "Cinema"),
    network: asString(cinema.network, "Frame 24"),
    citySlug: asString(cinema.city_slug, asString(cinema.citySlug)),
    neighborhood: asString(cinema.neighborhood, asString(cinema.city, "")),
    address: asString(cinema.address, ""),
    features: asArray(cinema.features).map((item) => asString(item)).filter(Boolean),
    formats: asArray(cinema.formats).map((item) => asString(item)).filter(Boolean),
    accessibility: asArray(cinema.accessibility).map((item) => asString(item)).filter(Boolean),
    loyaltyBlurb: asString(cinema.loyalty_blurb, "Benefícios variam por cinema."),
  };
};

export const toMovie = (input: unknown, citySlug?: string): MovieSummary => {
  const movie = asRecord(input);
  const title = asString(movie.title, asString(movie.brazil_title, asString(movie.original_title, "Filme")));
  const citySlugs = asArray(movie.city_slugs).map((item) => asString(item)).filter(Boolean);
  return {
    id: asString(movie.id),
    slug: asString(movie.slug, asString(movie.id)),
    title,
    originalTitle: asString(movie.original_title, title),
    tagline: asString(movie.tagline, asString(movie.short_synopsis, "")),
    synopsis: asString(movie.synopsis, asString(movie.short_synopsis, "")),
    runtimeMinutes: asNumber(movie.runtime_minutes, asNumber(movie.duration_minutes, 0)),
    ageRating: asString(movie.age_rating, "L"),
    genres: asArray(movie.genres).map((item) => asString(item)).filter(Boolean),
    formats: asArray(movie.formats).map((item) => asString(item)).filter(Boolean),
    exhibitionMode: "ambos",
    ancineRating: asString(movie.ancine_rating, ""),
    status: asNumber(movie.session_count, 0) > 0 ? "em-cartaz" : "em-breve",
    recommendationScore: asNumber(movie.recommendation_score, asNumber(movie.session_count, 0)),
    citySlugs: citySlugs.length ? citySlugs : citySlug ? [citySlug] : [],
    cast: asArray(movie.cast).map((item) => asString(item)).filter(Boolean),
    releaseDate: asString(movie.release_date) || undefined,
    posterUrl: asString(movie.poster_url, "/placeholder-poster.svg"),
    backdropUrl: asString(movie.backdrop_url, asString(movie.poster_url, "/placeholder-poster.svg")),
    trailerUrl: asString(movie.trailer_url, ""),
    editorialNote: asString(movie.editorial_note, ""),
  };
};

export const toSession = (input: unknown, citySlug: string): SessionGroup => {
  const session = asRecord(input);
  const room = asRecord(session.room ?? session.rooms);
  const cinema = asRecord(session.cinema ?? session.cinema_complexes);
  const projectionType = asRecord(session.projection_type ?? session.projection_types);
  const audioType = asRecord(session.audio_type ?? session.audio_types);
  const sessionLanguage = asRecord(session.session_language ?? session.session_languages);
  const startTime = session.start_time;
  const timeZone = asString(cinema.timezone, asString(session.timezone, DEFAULT_APP_TIMEZONE));
  return {
    id: asString(session.id),
    citySlug,
    movieId: asString(session.movie_id),
    cinemaId: asString(session.cinema_id, asString(cinema.id)),
    date: dateFromIso(startTime, timeZone),
    time: timeFromIso(startTime, timeZone),
    room: asString(room.name, asString(room.room_number, "Sala")),
    language: asString(
      session.language,
      asString(sessionLanguage.name, asString(audioType.name, asString(session.audio, "Consulte"))),
    ),
    subtitle: asString(session.subtitle, "Sem legenda"),
    format: asString(session.format, asString(projectionType.name, "2D")),
    occupancy: asString(session.occupancy, "low") as SessionGroup["occupancy"],
    priceFrom: asNumber(session.price_from, asNumber(session.base_ticket_price, 0)),
    seats: [],
  };
};

export const toSessionFromAnyCity = (input: unknown) => {
  const session = asRecord(input);
  const cinema = asRecord(session.cinema ?? session.cinema_complexes);
  const citySlug = asString(cinema.city_slug, asString(session.city_slug, ""));
  return toSession(session, citySlug);
};

export const toSeat = (input: unknown): SeatNode => {
  const seat = asRecord(input);
  const row = asString(seat.row_code);
  const number = asNumber(seat.column_number);
  const label = asString(seat.seat_code, `${row}${number}`);
  return {
    id: asString(seat.id),
    label,
    row,
    number,
    status: mapSeatStatus(seat),
    seatKind: mapSeatKind(seat.seat_kind),
    isAccessible: Boolean(seat.accessible),
    pricingZone: asString(seat.pricing_zone, "standard") as SeatNode["pricingZone"],
    premium: asNumber(seat.additional_value, 0) > 0,
  };
};

export const toProduct = (input: unknown): ConcessionProduct => {
  const product = asRecord(input);
  return {
    id: asString(product.id),
    name: asString(product.name, "Produto"),
    price: asNumber(product.price, asNumber(product.sale_price, 0)),
    description: asString(product.description, ""),
    imageUrl: asString(product.image_url) || null,
  };
};

const normalizeTicketCode = (name: string): TicketTypeCode => {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized.includes("inteira")) return "inteira";
  if (normalized.includes("crianc")) return "crianca";
  if (normalized.includes("estud")) return "meia_estudante";
  if (normalized.includes("idos") || normalized.includes("senior")) return "meia_idoso";
  if (normalized.includes("acompanh")) return "acompanhante_pcd";
  if (normalized.includes("pcd")) return "meia_pcd";
  if (normalized.includes("jovem") || normalized.includes("cadunico") || normalized.includes("baixa renda")) {
    return "meia_jovem_baixa_renda";
  }
  if (normalized.includes("cortes")) return "cortesia_codigo";
  if (normalized.includes("promo")) return "promocional_parceiro";
  if (normalized.includes("compan")) return "acompanhante_pcd";
  return "inteira";
};

export const toTicketType = (input: unknown): TicketType & { id?: string; priceModifier?: number } => {
  const ticket = asRecord(input);
  const label = asString(ticket.name, "Ingresso");
  return {
    id: asString(ticket.id),
    code: normalizeTicketCode(label),
    label,
    description: asString(ticket.description, ""),
    requiresDocument: normalizeTicketCode(label) !== "inteira",
    eligibility: {},
    priceModifier: asNumber(ticket.price_modifier, 1),
  };
};

export const getTenantCities = async (tenantSlug: string) => {
  const response = await publicApi.publicControllerGetCitiesV1({ tenantSlug });
  return asArray(response.data).map(toCity);
};

export const getTenantCompany = async (tenantSlug: string): Promise<TenantCompanySummary> => {
  const response = await publicApi.publicControllerGetCompanyBySlugV1({ tenantSlug });
  const company = asRecord(response.data);

  return {
    id: asString(company.id, tenantSlug),
    slug: asString(company.tenant_slug, tenantSlug),
    name: asString(company.trade_name, asString(company.name, tenantSlug)),
    logoUrl: asString(company.logo_url) || null,
  };
};

export const getTenantCity = async (tenantSlug: string, citySlug: string) => {
  const cities = await getTenantCities(tenantSlug);
  return cities.find((city) => city.slug === citySlug) ?? null;
};

export const getTenantCinemas = async (tenantSlug: string, citySlug: string) => {
  const response = await publicApi.publicControllerGetCinemasByCityV1({ tenantSlug, citySlug });
  return asArray(response.data).map(toCinema);
};

export const getTenantMovies = async (tenantSlug: string, citySlug: string, status?: string) => {
  const response = await publicApi.publicControllerGetMoviesByCityV1({ tenantSlug, citySlug, status });
  return asArray(response.data).map((movie) => toMovie(movie, citySlug));
};

export const getTenantMovie = async (tenantSlug: string, citySlug: string, movieSlug: string) => {
  const response = await publicApi.publicControllerGetMovieBySlugForCityV1({ tenantSlug, citySlug, movieSlug });
  return toMovie(response.data, citySlug);
};

export const getTenantMovieShowtimes = async (
  tenantSlug: string,
  citySlug: string,
  movieSlug: string,
  options?: { date?: string; format?: string; language?: string; cinemaId?: string },
) => {
  const response = await publicApi.publicControllerGetShowtimesForMovieSlugV1({
    tenantSlug,
    citySlug,
    movieSlug,
    ...options,
  });
  return asArray(response.data).map((session) => toSession(session, citySlug));
};

export const getTenantShowtimeSeats = async (showtimeId: string) => {
  const response = await publicApi.publicControllerGetSeatsMapV1({ id: showtimeId });
  const data = asRecord(response.data);
  return {
    ...data,
    seats: asArray(data.seats).map(toSeat),
  };
};

export const getTenantSearch = async (tenantSlug: string, query: string, citySlug?: string) => {
  const response = await publicApi.publicControllerSearchTenantStorefrontV1({ tenantSlug, query, citySlug });
  return asArray(response.data).map((item) => asRecord(item) as unknown as SearchItem);
};

export const getTenantProducts = async (tenantSlug: string, complexId?: string) => {
  const response = await publicApi.publicControllerGetProductsV1({ tenantSlug, complexId });
  return asArray(response.data).map(toProduct);
};

export const getTenantTicketTypes = async (tenantSlug: string) => {
  const response = await publicApi.publicControllerGetTicketTypesV1({ tenantSlug });
  const mapped = asArray(response.data).map(toTicketType);
  const deduped = new Map<TicketTypeCode, TicketType & { id?: string; priceModifier?: number }>();

  for (const ticketType of mapped) {
    if (!deduped.has(ticketType.code)) {
      deduped.set(ticketType.code, ticketType);
    }
  }

  return Array.from(deduped.values());
};

export const getTenantPaymentMethods = async (tenantSlug: string) => {
  const response = await publicApi.publicControllerGetPaymentMethodsV1({ tenantSlug });
  return asArray(response.data).map((method) => asRecord(method));
};

export const getTenantShowtimes = async (
  tenantSlug: string,
  options?: { complexId?: string; movieId?: string; date?: string },
) => {
  const response = await publicApi.publicControllerGetShowtimesV1({
    tenantSlug,
    complexId: options?.complexId,
    movieId: options?.movieId,
    date: options?.date,
  });
  return asArray(response.data).map(toSessionFromAnyCity);
};

export const getTenantSaleByReference = async (tenantSlug: string, reference: string) => {
  const response = await publicApi.publicControllerGetSaleDetailsV1({
    tenantSlug,
    reference,
  });
  return asRecord(response.data);
};
