import { notFound } from "next/navigation";
import { MovieBrowser } from "@/components/cinema/movie-browser";
import { SectionHeading } from "@/components/ui/section-heading";
import { copy } from "@/lib/copy/catalog";
import { getCityBySlug, getMoviesForCity } from "@/lib/storefront/service";

export default async function MoviesPage({ params }: { params: Promise<{ citySlug: string }> }) {
  const { citySlug } = await params;
  const [city, movies] = await Promise.all([
    getCityBySlug(citySlug),
    getMoviesForCity(citySlug),
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
