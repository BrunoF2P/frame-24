import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { SiteFooter } from "@/components/layout/site-footer";
import type { City } from "@/types/storefront";

export const AppShell = ({
  children,
  citySlug,
  tenantSlug,
  companyName,
  useTenantPath = false,
  cities,
}: {
  children: ReactNode;
  citySlug?: string;
  tenantSlug?: string;
  companyName?: string;
  useTenantPath?: boolean;
  cities?: City[];
}) => (
  <>
    <AppHeader
      citySlug={citySlug}
      tenantSlug={tenantSlug}
      useTenantPath={useTenantPath}
      cities={cities}
    />
    <main className="min-h-screen bg-background text-foreground">{children}</main>
    <SiteFooter
      cities={cities}
      companyName={companyName}
      tenantSlug={tenantSlug}
      useTenantPath={useTenantPath}
    />
  </>
);
