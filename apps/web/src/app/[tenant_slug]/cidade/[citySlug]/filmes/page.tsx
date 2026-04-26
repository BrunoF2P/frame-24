import { notFound } from "next/navigation";
import { MovieBrowser } from "@/components/cinema/movie-browser";
import { SectionHeading } from "@/components/ui/section-heading";
import { getTenantCity, getTenantMovies } from "@/lib/storefront/api";

export default async function TenantMoviesPage({
  params,
}: {
  params: Promise<{ tenant_slug: string; citySlug: string }>;
}) {
  const { tenant_slug, citySlug } = await params;
  const [city, movies] = await Promise.all([
    getTenantCity(tenant_slug, citySlug),
    getTenantMovies(tenant_slug, citySlug),
  ]);

  if (!city) {
    notFound();
  }

  return (
    <main className="page-shell space-y-8 py-10">
      <SectionHeading
        eyebrow={city.name}
        title="Todos os filmes"
        description="Filmes com sessões disponíveis neste tenant e nesta cidade."
      />
      <MovieBrowser citySlug={citySlug} movies={movies} tenantSlug={tenant_slug} />
    </main>
  );
}
