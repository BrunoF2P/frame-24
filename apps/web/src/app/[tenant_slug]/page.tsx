import { redirect } from "next/navigation";
import { getTenantCities } from "@/lib/storefront/api";

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}) {
  const { tenant_slug } = await params;
  const cities = await getTenantCities(tenant_slug);
  const firstCity = cities[0];

  if (!firstCity) {
    return (
      <main className="page-shell py-16">
        <section className="rounded-[var(--radius-md)] border border-border bg-surface p-6">
          <p className="text-sm text-foreground-muted">
            Este cinema ainda não possui cidades ativas para venda online.
          </p>
        </section>
      </main>
    );
  }

  redirect(`/${tenant_slug}/cidade/${firstCity.slug}`);
}
