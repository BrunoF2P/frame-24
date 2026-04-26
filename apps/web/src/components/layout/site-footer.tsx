"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/copy/catalog";
import { withTenantPath } from "@/lib/tenant-routing";
import type { City } from "@/types/storefront";

const humanizeTenantSlug = (tenantSlug?: string) =>
  tenantSlug
    ?.split("-")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ") ?? null;

export const SiteFooter = ({
  tenantSlug,
  companyName,
  cities = [],
  useTenantPath = false,
}: {
  tenantSlug?: string;
  companyName?: string;
  cities?: City[];
  useTenantPath?: boolean;
}) => {
  const pathname = usePathname();
  const brandLabel = companyName || humanizeTenantSlug(tenantSlug) || copy("brandName");
  const tenantHomeHref = useTenantPath && tenantSlug ? `/${tenantSlug}` : "/";
  const tenantNav = [
    { label: "Início", href: tenantHomeHref },
    { label: copy("footerSearchLink"), href: withTenantPath(pathname, "/busca") },
    { label: copy("footerProfileLink"), href: withTenantPath(pathname, "/perfil") },
    { label: "Ingressos", href: withTenantPath(pathname, "/perfil/ingressos") },
    { label: "Pedidos", href: withTenantPath(pathname, "/perfil/pedidos") },
  ];
  const cityLinks = cities.slice(0, 4).map((city) => ({
    label: `${city.name}, ${city.state}`,
    href: useTenantPath && tenantSlug ? `/${tenantSlug}/cidade/${city.slug}` : `/cidade/${city.slug}`,
  }));
  const showCorporateFooter = !tenantSlug;

  return (
    <footer className="border-t border-border/60 bg-background-elevated/60 py-10">
      <div className="page-shell">
        {showCorporateFooter ? (
          <div className="flex flex-col gap-2 text-xs text-foreground-muted md:flex-row md:items-center md:justify-between">
            <p>Frame 24.</p>
            <p>Plataforma multiempresa para operação digital de cinema.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <section className="space-y-3">
                <p className="text-xs uppercase tracking-[0.22em] text-accent-red-500">Parceiro exibidor</p>
                <div className="space-y-2">
                  <p className="font-display text-2xl text-foreground">{brandLabel}</p>
                  <p className="max-w-xl text-sm leading-6 text-foreground-muted">
                    {`${brandLabel} opera sua experiência digital na Frame 24, com catálogo, horários, ingressos e histórico em um fluxo único.`}
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Navegação rápida</p>
                <ul className="space-y-2 text-sm text-foreground-muted">
                  {tenantNav.map((item) => (
                    <li key={item.href}>
                      <Link className="transition-colors hover:text-foreground" href={item.href}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Cidades e unidades</p>
                <ul className="space-y-2 text-sm text-foreground-muted">
                  {(cityLinks.length
                    ? cityLinks
                    : [{ label: "Catálogo da empresa", href: tenantHomeHref }]).map((item) => (
                    <li key={item.href}>
                      <Link className="transition-colors hover:text-foreground" href={item.href}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="flex flex-col gap-2 border-t border-border/60 pt-4 text-xs text-foreground-muted md:flex-row md:items-center md:justify-between">
              <p>{`${brandLabel} na Frame 24`}.</p>
              <p>Compra online, pedido confirmado e histórico do cliente no mesmo ecossistema.</p>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};
