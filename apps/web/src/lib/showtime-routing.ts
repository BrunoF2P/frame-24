import { slugify } from "@/lib/utils";
import type { Cinema, MovieSummary, SessionGroup } from "@/types/storefront";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeRoomSegment = (room: string) => {
  const trimmed = room.trim();
  if (!trimmed) return "sala";
  return trimmed.toLowerCase().startsWith("sala ") ? trimmed : `sala ${trimmed}`;
};

const normalizeTimeSegment = (time: string) => time.trim().replace(":", "h");

export const isShowtimeUuid = (value: string) => UUID_PATTERN.test(value.trim());

export const buildShowtimeSlug = ({
  movieSlug,
  cinemaSlug,
  date,
  time,
  room,
}: {
  movieSlug: string;
  cinemaSlug: string;
  date: string;
  time: string;
  room: string;
}) =>
  slugify(`${movieSlug} ${date} ${normalizeTimeSegment(time)} ${cinemaSlug} ${normalizeRoomSegment(room)}`);

export const buildShowtimeHref = ({
  citySlug,
  session,
  cinema,
  movie,
  tenantSlug,
}: {
  citySlug: string;
  session: SessionGroup;
  cinema: Pick<Cinema, "slug">;
  movie: Pick<MovieSummary, "slug">;
  tenantSlug?: string;
}) => {
  const prefix = tenantSlug ? `/${tenantSlug}` : "";
  const slug = buildShowtimeSlug({
    movieSlug: movie.slug,
    cinemaSlug: cinema.slug,
    date: session.date,
    time: session.time,
    room: session.room,
  });

  return `${prefix}/cidade/${citySlug}/sessao/${slug}`;
};
