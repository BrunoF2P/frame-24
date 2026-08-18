import { notFound } from "next/navigation";
import {
  getCityBySlug,
  getCinemasForCity,
  getMovieById,
  getSessionByReference,
  getTicketTypesForSession,
} from "@/lib/storefront/service";
import { ShowtimeSessionClient } from "@/components/cinema/showtime-session-client";

export default async function TenantCityShowtimePage({
  params,
}: {
  params: Promise<{ tenant_slug: string; citySlug: string; showtimeId: string }>;
}) {
  const { tenant_slug, citySlug, showtimeId } = await params;
  const session = await getSessionByReference(showtimeId, citySlug, tenant_slug);

  if (!session || session.citySlug !== citySlug) {
    notFound();
  }

  const [movie, cityCinemas, city] = await Promise.all([
    getMovieById(session.movieId, tenant_slug),
    getCinemasForCity(citySlug, tenant_slug),
    getCityBySlug(citySlug, tenant_slug),
  ]);
  const cinema = cityCinemas.find((item) => item.id === session.cinemaId) ?? null;

  if (!movie || !cinema || !city) {
    notFound();
  }
  const ticketTypes = await getTicketTypesForSession(
    citySlug,
    session.cinemaId,
    session.id,
    tenant_slug,
  );

  return (
    <ShowtimeSessionClient
      session={session}
      movie={{ id: movie.id, slug: movie.slug, title: movie.title, posterUrl: movie.posterUrl }}
      cinema={{ id: cinema.id, name: cinema.name }}
      city={{ slug: city.slug, name: city.name, state: city.state }}
      ticketTypes={ticketTypes}
      tenantSlug={tenant_slug}
    />
  );
}
