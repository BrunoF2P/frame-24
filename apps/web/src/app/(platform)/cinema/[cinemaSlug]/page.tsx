import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { SessionPicker } from "@/components/cinema/session-picker";
import { getCinemaBySlug, getMoviesForCity, getSessionsForCity } from "@/lib/storefront/service";
import { resolvePublicTenantSlug } from "@/lib/resolve-public-tenant";

export default async function CinemaPage({
  params,
}: {
  params: Promise<{ cinemaSlug: string }>;
}) {
  const { cinemaSlug } = await params;
  const tenantSlug = await resolvePublicTenantSlug();
  const cinema = tenantSlug ? await getCinemaBySlug(cinemaSlug, tenantSlug) : null;

  if (!cinema) {
    notFound();
  }

  const [sessions, movies] = await Promise.all([
    getSessionsForCity(cinema.citySlug, { cinemaId: cinema.id }, tenantSlug ?? undefined),
    getMoviesForCity(cinema.citySlug, "em-cartaz", tenantSlug ?? undefined),
  ]);
  const visibleSessions = sessions.slice(0, 4);

  return (
    <main className="page-shell space-y-8 py-10">
      <SectionHeading
        eyebrow={cinema.network}
        title={cinema.name}
        description={`${cinema.neighborhood} • ${cinema.address}`}
      />
      <Card className="grid gap-4 lg:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent-red-300">Formatos</p>
          <p className="mt-3 text-sm text-foreground-muted">{cinema.formats.join(" • ")}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent-red-300">Acessibilidade</p>
          <p className="mt-3 text-sm text-foreground-muted">{cinema.accessibility.join(" • ")}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent-red-300">Diferencial</p>
          <p className="mt-3 text-sm text-foreground-muted">{cinema.loyaltyBlurb}</p>
        </div>
      </Card>
      <section className="space-y-4">
        <h2 className="font-display text-4xl">Sessões disponíveis</h2>
        <SessionPicker cinemas={[cinema]} citySlug={cinema.citySlug} movies={movies} sessions={visibleSessions} />
      </section>
    </main>
  );
}
