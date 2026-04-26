"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { City } from "@/types/storefront";
import { cn } from "@/lib/utils";
import { useCityStore } from "@/stores/use-city-store";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip-toggle";
import { DialogShellHeader } from "@/components/ui/dialog-shell";
import { Icon } from "@/components/ui/icon";

export const CitySelector = ({
  activeCity,
  cities,
  mobileFullWidth = false,
  tenantSlug,
  useTenantPath = false,
}: {
  activeCity: City;
  cities: City[];
  mobileFullWidth?: boolean;
  tenantSlug?: string;
  useTenantPath?: boolean;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const setActiveCity = useCityStore((state) => state.setActiveCity);
  const [openDesktop, setOpenDesktop] = useState(false);
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const desktopRef = useRef<HTMLDivElement>(null);

  const resolvePath = useMemo(() => {
    const currentPath = pathname ?? "/";
    const segments = currentPath.split("/").filter(Boolean);

    return (citySlug: string) => {
      if (useTenantPath && tenantSlug && segments[0] === tenantSlug && segments[1] === "cidade") {
        const nextSegments = [tenantSlug, "cidade", citySlug, ...segments.slice(3)];
        return `/${nextSegments.join("/")}`;
      }

      if (segments[0] === "cidade" && segments[1]) {
        const nextSegments = [segments[0], citySlug, ...segments.slice(2)];
        return `/${nextSegments.join("/")}`;
      }

      return useTenantPath && tenantSlug ? `/${tenantSlug}/cidade/${citySlug}` : `/cidade/${citySlug}`;
    };
  }, [pathname, tenantSlug, useTenantPath]);

  const handleSelect = (city: City) => {
    setActiveCity(city.slug);
    setOpenDesktop(false);
    router.push(resolvePath(city.slug));
  };

  const states = useMemo(
    () => Array.from(new Set(cities.map((city) => city.state))).sort(),
    [cities],
  );
  const selectedState = stateFilter ?? activeCity.state;
  const visibleCities = useMemo(
    () => cities.filter((city) => city.state === selectedState),
    [cities, selectedState],
  );

  useEffect(() => {
    if (!openDesktop) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!desktopRef.current?.contains(event.target as Node)) {
        setOpenDesktop(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openDesktop]);

  return (
    <>
      <div className="relative hidden md:block" ref={desktopRef}>
        <Button
          onClick={() => setOpenDesktop((value) => !value)}
          variant="secondary"
          size="md"
          className="whitespace-nowrap"
        >
          <Icon name="mapPin" size="xs" className="text-foreground-muted" />
          {activeCity.name}, {activeCity.state}
          <Icon name="chevronDown" size="xs" className="text-foreground-muted" />
        </Button>
        {openDesktop ? (
          <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-[320px] rounded-[var(--radius-lg)] border border-border bg-background-elevated p-3 shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
            <div className="mb-3 flex flex-wrap gap-2">
              {states.map((state) => (
                <ChipToggle
                  key={state}
                  onClick={() => setStateFilter(state)}
                  active={state === selectedState}
                  className="h-8 px-2.5 text-xs"
                >
                  {state}
                </ChipToggle>
              ))}
            </div>
            <div className="space-y-2">
              {visibleCities.map((city) => (
                <Button
                  key={city.id}
                  type="button"
                  onClick={() => handleSelect(city)}
                  variant="quiet"
                  className={cn(
                    "h-auto w-full flex-col items-start justify-start gap-0 rounded-[var(--radius-md)] border border-transparent px-3 py-3 text-left",
                    city.slug === activeCity.slug
                      ? "border-accent-red-500/35 bg-accent-red-500/8 text-foreground"
                      : "text-foreground hover:border-border",
                  )}
                >
                  <span className="text-sm font-semibold">{city.name}</span>
                  <span className="text-sm text-foreground-muted">{city.state}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <Dialog.Root>
        <Dialog.Trigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={cn(
              "items-center gap-2 md:hidden",
              mobileFullWidth && "w-full justify-between px-4",
            )}
          >
            <Icon name="mapPin" size="xs" className="text-foreground-muted" />
            <span className="truncate">{activeCity.name}, {activeCity.state}</span>
            <Icon name="chevronDown" size="xs" className="text-foreground-muted" />
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 md:hidden" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-background p-4 pb-6 md:hidden">
          <div className="mx-auto max-w-lg">
              <DialogShellHeader
                className="mb-4"
                title="Escolher cidade"
                description="Selecione a cidade e o estado que devem orientar a vitrine pública."
              />
              <div className="mb-3 flex flex-wrap gap-2">
                {states.map((state) => (
                  <ChipToggle
                    key={state}
                    onClick={() => setStateFilter(state)}
                    active={state === selectedState}
                    className="h-8 px-2.5 text-xs"
                  >
                    {state}
                  </ChipToggle>
                ))}
              </div>
              <div className="space-y-2">
                {visibleCities.map((city) => (
                  <Dialog.Close asChild key={city.id}>
                    <Button
                      type="button"
                      onClick={() => handleSelect(city)}
                      variant="quiet"
                      className={cn(
                        "h-auto w-full flex-col items-start justify-start gap-0 rounded-[var(--radius-md)] border border-border px-4 py-4 text-left",
                        city.slug === activeCity.slug && "border-accent-red-500/40 bg-accent-red-500/8",
                      )}
                    >
                      <span className="text-sm font-semibold text-foreground">{city.name}</span>
                      <span className="text-sm text-foreground-muted">{city.state}</span>
                    </Button>
                  </Dialog.Close>
                ))}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};
