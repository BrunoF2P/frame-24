import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getTenantCities } from "@/lib/storefront/api";
import { getTenantCompany } from "@/lib/storefront/api";
import { resolvePublicTenantSlug } from "@/lib/resolve-public-tenant";
import { getTenantSlugFromHost, normalizeHost } from "@/lib/tenant-routing";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const tenantSlug = await resolvePublicTenantSlug();
  const requestHeaders = await headers();
  const rawHost = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const isSubdomainTenant = !!getTenantSlugFromHost(normalizeHost(rawHost));
  const cities = tenantSlug ? await getTenantCities(tenantSlug).catch(() => []) : [];
  const company = tenantSlug ? await getTenantCompany(tenantSlug).catch(() => null) : null;

  return (
    <AppShell
      tenantSlug={tenantSlug ?? undefined}
      useTenantPath={!isSubdomainTenant && !!tenantSlug}
      companyName={company?.name ?? undefined}
      cities={cities}
    >
      {children}
    </AppShell>
  );
}
