import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  getCityBySlug,
  getCinemasForCity,
  getMovieById,
  getSessionByReference,
  getTicketTypesForSession,
} from "@/lib/storefront/service";
import { resolvePublicTenantSlug } from "@/lib/resolve-public-tenant";
import { buildTenantPrefix, normalizeHost } from "@/lib/tenant-routing";
import { ShowtimeSessionClient } from "@/components/cinema/showtime-session-client";

export default async function ShowtimePage({
  params,
}: {
  params: Promise<{ citySlug: string; showtimeId: string }>;
}) {
  const { citySlug, showtimeId } = await params;
  const tenantSlug = await resolvePublicTenantSlug();
  const requestHeaders = await headers();
  const rawHost = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const pathSlug: string | undefined = buildTenantPrefix(normalizeHost(rawHost), tenantSlug) ? (tenantSlug ?? undefined) : undefined;
  const session = tenantSlug ? await getSessionByReference(showtimeId, citySlug, tenantSlug) : null;

  if (!session || session.citySlug !== citySlug) {
    notFound();
  }

  const [movie, cityCinemas, city] = await Promise.all([
    getMovieById(session.movieId, tenantSlug ?? undefined),
    getCinemasForCity(citySlug, tenantSlug ?? undefined),
    getCityBySlug(citySlug, tenantSlug ?? undefined),
  ]);
  const cinema = cityCinemas.find((item) => item.id === session.cinemaId) ?? null;

  if (!movie || !cinema || !city) {
    notFound();
  }
  const ticketTypes = await getTicketTypesForSession(
    citySlug,
    session.cinemaId,
    session.id,
    tenantSlug ?? undefined,
  );

  return (
    <ShowtimeSessionClient
      session={session}
      movie={{ id: movie.id, slug: movie.slug, title: movie.title, posterUrl: movie.posterUrl }}
      cinema={{ id: cinema.id, name: cinema.name }}
      city={{ slug: city.slug, name: city.name, state: city.state }}
      ticketTypes={ticketTypes}
      tenantSlug={pathSlug}
    />
  );
}
