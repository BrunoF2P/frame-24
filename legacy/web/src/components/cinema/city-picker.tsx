"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { City } from "@/types/storefront";
import { useCityStore } from "@/stores/use-city-store";
import { cn } from "@/lib/utils";

export const CityPicker = ({
  cities,
  currentCitySlug,
}: {
  cities: City[];
  currentCitySlug?: string;
}) => {
  const pathname = usePathname();
  const { activeCitySlug, setActiveCity } = useCityStore();
  const selected = currentCitySlug ?? activeCitySlug;

  useEffect(() => {
    if (currentCitySlug) {
      setActiveCity(currentCitySlug);
    }
  }, [currentCitySlug, setActiveCity]);

  return (
    <div className="flex flex-wrap gap-2">
      {cities.map((city) => {
        const active = selected === city.slug;
        const href = pathname?.includes("/filme/") || pathname?.includes("/sessao/")
          ? `/cidade/${city.slug}`
          : `/cidade/${city.slug}`;

        return (
          <Link
            key={city.id}
            href={href}
            className={cn(
              "rounded-full border px-4 py-2 text-sm",
              active
                ? "border-accent-red-500 bg-accent-red-500 text-white"
                : "border-border bg-surface text-foreground-muted hover:bg-background-strong",
            )}
          >
            {city.name}
          </Link>
        );
      })}
    </div>
  );
};
