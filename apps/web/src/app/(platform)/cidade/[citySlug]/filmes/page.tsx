import { notFound } from "next/navigation";
import { MovieBrowser } from "@/components/cinema/movie-browser";
import { SectionHeading } from "@/components/ui/section-heading";
import { copy } from "@/lib/copy/catalog";
import { getCityBySlug, getMoviesForCity } from "@/lib/storefront/service";
import { resolvePublicTenantSlug } from "@/lib/resolve-public-tenant";

export default async function MoviesPage({ params }: { params: Promise<{ citySlug: string }> }) {
  const { citySlug } = await params;
  const tenantSlug = await resolvePublicTenantSlug();
  const [city, movies] = await Promise.all([
    tenantSlug ? getCityBySlug(citySlug, tenantSlug) : null,
    tenantSlug ? getMoviesForCity(citySlug, undefined, tenantSlug) : [],
  ]);

  if (!city) {
    notFound();
  }

  return (
    <main className="page-shell space-y-8 py-10">
      <SectionHeading
        eyebrow={copy("catalogEyebrow")}
        title={`${copy("catalogTitlePrefix")} ${city.name}`}
        description={copy("catalogDescription")}
      />
      <MovieBrowser citySlug={citySlug} movies={movies} />
    </main>
  );
}
