import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getTenantCities } from "@/lib/storefront/api";
import { getTenantCompany } from "@/lib/storefront/api";
import { resolvePublicTenantSlug } from "@/lib/resolve-public-tenant";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const tenantSlug = await resolvePublicTenantSlug();
  const cities = tenantSlug ? await getTenantCities(tenantSlug).catch(() => []) : [];
  const company = tenantSlug ? await getTenantCompany(tenantSlug).catch(() => null) : null;

  return (
    <AppShell tenantSlug={tenantSlug ?? undefined} companyName={company?.name ?? undefined} cities={cities}>
      {children}
    </AppShell>
  );
}
