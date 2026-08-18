import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { resolveRequestedTenantSlug } from "@/lib/resolve-public-tenant";
import { getTenantCities, getTenantCompany } from "@/lib/storefront/api";

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const tenantSlug = await resolveRequestedTenantSlug();
  const [cities, company] = tenantSlug
    ? await Promise.all([
        getTenantCities(tenantSlug).catch(() => []),
        getTenantCompany(tenantSlug).catch(() => null),
      ])
    : [[], null];

  return (
    <AppShell
      tenantSlug={tenantSlug ?? undefined}
      companyName={company?.name ?? undefined}
      cities={cities}
    >
      {children}
    </AppShell>
  );
}
