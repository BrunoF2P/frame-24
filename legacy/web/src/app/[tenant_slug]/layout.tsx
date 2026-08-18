import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getTenantCities, getTenantCompany } from "@/lib/storefront/api";

async function ensureTenantExists(tenantSlug: string) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const response = await fetch(`${apiBase}/v1/public/companies/${tenantSlug}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      notFound();
    }
  } catch {
    notFound();
  }
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenant_slug: string }>;
}) {
  const { tenant_slug } = await params;
  await ensureTenantExists(tenant_slug);
  const [cities, company] = await Promise.all([
    getTenantCities(tenant_slug).catch(() => []),
    getTenantCompany(tenant_slug).catch(() => null),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader tenantSlug={tenant_slug} useTenantPath cities={cities} />
      <main>{children}</main>
      <SiteFooter
        cities={cities}
        companyName={company?.name ?? undefined}
        tenantSlug={tenant_slug}
        useTenantPath
      />
    </div>
  );
}
