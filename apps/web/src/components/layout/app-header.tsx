"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AuthModal } from "@/components/layout/auth-modal";
import { CitySelector } from "@/components/layout/city-selector";
import { GlobalSearchCombobox } from "@/components/layout/global-search-combobox";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { copy, formatCityNowShowingLabel } from "@/lib/copy/catalog";
import { useCityStore } from "@/stores/use-city-store";
import { useAuth } from "@/contexts/auth-context";
import type { City } from "@/types/storefront";

interface AppHeaderProps {
  citySlug?: string;
  tenantSlug?: string;
  useTenantPath?: boolean;
  cities?: City[];
}

export const AppHeader = ({
  citySlug,
  tenantSlug,
  useTenantPath = false,
  cities = [],
}: AppHeaderProps) => {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { hasSession } = useAuth();
  const storedCity = useCityStore((state) => state.activeCitySlug);
  const fallbackCity =
    cities[0] ??
    ({
      id: "fallback",
      slug: citySlug ?? storedCity ?? "cidade",
      name: "Cidade",
      state: "",
      heroLabel: "Cidade",
      intro: "",
      timezone: "America/Bahia",
    } satisfies City);
  const routeCity = pathname?.startsWith("/cidade/")
    ? pathname.split("/").filter(Boolean)[1]
    : pathname?.split("/").filter(Boolean)[1] === "cidade"
      ? pathname.split("/").filter(Boolean)[2]
      : citySlug ?? storedCity;
  const activeCity = cities.find((city) => city.slug === routeCity) ?? fallbackCity;
  const tenantPrefix = tenantSlug && useTenantPath ? `/${tenantSlug}` : "";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background-elevated/95 backdrop-blur-xl">
      <div className="page-shell py-3">
        <div className="flex min-h-10 items-center justify-between gap-3">
          <nav aria-label="Navegação primária" className="flex min-w-0 items-center gap-3">
            <Link
              aria-label={copy("brandName")}
              className="shrink-0 text-2xl font-bold tracking-[-0.04em]"
              href={tenantPrefix || "/"}
            >
              <motion.span
                animate={
                  reduceMotion
                    ? { opacity: 1 }
                    : { opacity: [0, 1], y: [6, 0] }
                }
                className="relative inline-flex items-center"
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <span className="text-foreground">Frame</span>
                <motion.span
                  animate={reduceMotion ? { opacity: 1, scaleX: 1 } : { opacity: [0.65, 1], scaleX: [0.85, 1] }}
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-1 left-0 h-[2px] w-full origin-left rounded-full bg-gradient-to-r from-accent-red-500/0 via-accent-red-500 to-accent-red-500/0"
                  initial={reduceMotion ? false : { opacity: 0, scaleX: 0.7 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                />
                <motion.span
                  animate={reduceMotion ? { opacity: 1 } : { opacity: [0.9, 1, 0.9] }}
                  aria-hidden="true"
                  className="text-accent-red-500"
                  transition={
                    reduceMotion
                      ? undefined
                      : { duration: 3.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                  }
                >
                  24
                </motion.span>
              </motion.span>
            </Link>
            <div className="hidden md:block">
              <CitySelector activeCity={activeCity} cities={cities} tenantSlug={tenantSlug} useTenantPath={useTenantPath} />
            </div>
          </nav>
          <nav aria-label="Ações da conta e busca" className="hidden items-center gap-2 md:flex md:flex-1 md:justify-end">
            <GlobalSearchCombobox
              currentCityLabel={activeCity.name}
              currentCitySlug={activeCity.slug}
              initialItems={[
                {
                  id: activeCity.id,
                  type: "city",
                  title: activeCity.name,
                  subtitle: formatCityNowShowingLabel(activeCity.state),
                  href: `${tenantPrefix}/cidade/${activeCity.slug}`,
                },
              ]}
              tenantSlug={tenantSlug}
              useTenantPath={useTenantPath}
            />
            {hasSession ? (
              <Button asChild className="hidden xl:inline-flex" size="md" variant="ghost">
                <Link href={`${tenantPrefix}/perfil/ingressos`}>
                  <Icon name="ticket" size="sm" />
                  <span className="whitespace-nowrap">{copy("headerMyTickets")}</span>
                </Link>
              </Button>
            ) : null}
            <ThemeToggle />
            <AuthModal />
          </nav>
          <nav aria-label="Ações rápidas no mobile" className="flex items-center gap-2 md:hidden">
            <GlobalSearchCombobox
              mobileIconOnly
              currentCityLabel={activeCity.name}
              currentCitySlug={activeCity.slug}
              initialItems={[
                {
                  id: activeCity.id,
                  type: "city",
                  title: activeCity.name,
                  subtitle: formatCityNowShowingLabel(activeCity.state),
                  href: `${tenantPrefix}/cidade/${activeCity.slug}`,
                },
              ]}
              tenantSlug={tenantSlug}
              useTenantPath={useTenantPath}
            />
            <ThemeToggle compact />
            <AuthModal mobileIconOnly />
          </nav>
        </div>
        <div className="mt-2 md:hidden">
          <CitySelector activeCity={activeCity} cities={cities} mobileFullWidth tenantSlug={tenantSlug} useTenantPath={useTenantPath} />
        </div>
      </div>
    </header>
  );
};
