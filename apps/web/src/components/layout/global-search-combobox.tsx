"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { searchStorefront } from "@/lib/storefront/service";
import { getTenantSearch } from "@/lib/storefront/api";
import type { SearchItem } from "@/types/storefront";
import { cn } from "@/lib/utils";
import type { IconName } from "@/lib/icon-registry";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip-toggle";
import { DialogShellHeader } from "@/components/ui/dialog-shell";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  copy,
  copyList,
  formatSearchDesktopPlaceholder,
  formatSearchMobilePlaceholder,
} from "@/lib/copy/catalog";

const typeIcon = {
  movie: "film",
  cinema: "building",
  city: "mapPin",
} as const;

const typeLabel = {
  movie: copy("searchGroupMovies"),
  cinema: copy("searchGroupCinemas"),
  city: copy("searchGroupCities"),
};

const groupedItems = (items: SearchItem[]) =>
  items.reduce<Record<SearchItem["type"], SearchItem[]>>(
    (acc, item) => {
      acc[item.type].push(item);
      return acc;
    },
    { movie: [], cinema: [], city: [] },
  );

const SearchResults = ({
  items,
  onSelect,
  tenantSlug,
  useTenantPath = false,
}: {
  items: SearchItem[];
  onSelect?: () => void;
  tenantSlug?: string;
  useTenantPath?: boolean;
}) => {
  const groups = groupedItems(items);

  return (
    <div className="space-y-4">
      {(Object.keys(groups) as Array<SearchItem["type"]>).map((type) => {
        const list = groups[type];

        if (!list.length) {
          return null;
        }

        return (
          <section key={type} aria-label={typeLabel[type]} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground-muted">
              {typeLabel[type]}
            </p>
            <ul className="space-y-2">
              {list.map((item) => {
                const iconName = typeIcon[item.type] as IconName;
                const href =
                  useTenantPath && tenantSlug && item.href.startsWith("/") && !item.href.startsWith(`/${tenantSlug}/`)
                    ? `/${tenantSlug}${item.href}`
                    : item.href;

                return (
                  <li key={`${item.type}-${item.id}`}>
                    <Link
                      href={href}
                      onClick={onSelect}
                      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 hover:border-accent-red-500/40 hover:bg-background-strong"
                    >
                      <span className="rounded-[var(--radius-sm)] bg-background-strong p-2 text-foreground-muted">
                        <Icon name={iconName} size="sm" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{item.title}</span>
                        <span className="block truncate text-sm text-foreground-muted">{item.subtitle}</span>
                      </span>
                      <Icon name="arrowRight" size="sm" className="text-foreground-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export const GlobalSearchCombobox = ({
  initialItems,
  currentCityLabel,
  currentCitySlug,
  mobileIconOnly = false,
  tenantSlug,
  useTenantPath = false,
}: {
  initialItems: SearchItem[];
  currentCityLabel: string;
  currentCitySlug: string;
  mobileIconOnly?: boolean;
  tenantSlug?: string;
  useTenantPath?: boolean;
}) => {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>(initialItems);
  const [open, setOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const desktopSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const results = tenantSlug
        ? await getTenantSearch(tenantSlug, deferredQuery, currentCitySlug)
        : await searchStorefront(deferredQuery, currentCitySlug);
      if (!cancelled) {
        setItems(results);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [currentCitySlug, deferredQuery, tenantSlug]);

  const quickTerms = useMemo(
    () =>
      copyList(
        "searchQuickToday",
        "searchQuickImax",
        "searchQuickPromotions",
        "searchQuickNearby",
      ),
    [],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!desktopSearchRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <>
      <div className="hidden w-full xl:block xl:min-w-[24rem] xl:flex-1 xl:max-w-[56rem]">
        <div className="relative" ref={desktopSearchRef}>
          <Icon
            name="search"
            size="md"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted"
          />
          <Input
            value={query}
            onChange={(event) => {
              setOpen(true);
              setQuery(event.target.value);
            }}
            onFocus={() => setOpen(true)}
            placeholder={formatSearchDesktopPlaceholder(currentCityLabel)}
            aria-label="Buscar filme ou cinema"
            className="h-11 pl-11 pr-4"
          />
          {open ? (
            <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 rounded-[var(--radius-lg)] border border-border bg-background-elevated p-4 shadow-[0_18px_48px_rgba(0,0,0,0.2)]">
              {!query.trim() ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {quickTerms.map((term) => (
                      <ChipToggle
                        key={term}
                        onClick={() => setQuery(term)}
                      >
                        {term}
                      </ChipToggle>
                    ))}
                  </div>
                  <SearchResults items={items} onSelect={() => setOpen(false)} tenantSlug={tenantSlug} useTenantPath={useTenantPath} />
                </div>
              ) : (
                <SearchResults items={items} onSelect={() => setOpen(false)} tenantSlug={tenantSlug} useTenantPath={useTenantPath} />
              )}
              <Button
                onClick={() => setOpen(false)}
                variant="quiet"
                size="sm"
                className="mt-4"
              >
                {copy("searchClose")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog.Root>
        <Dialog.Trigger asChild>
          <Button
            aria-label={copy("searchOpenAria")}
            variant="secondary"
            size="sm"
            className={cn("h-10 items-center gap-2 xl:hidden", mobileIconOnly && "w-10 px-0")}
          >
            <Icon name="search" size="sm" />
            <span className={cn(mobileIconOnly && "sr-only")}>Buscar</span>
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55" />
          <Dialog.Content className="fixed inset-0 z-50 bg-background p-4 pt-6">
            <div className="mx-auto flex h-full max-w-2xl flex-col">
              <DialogShellHeader
                className="mb-4"
                title={copy("searchMobileTitle")}
                description={copy("searchMobileDescription")}
              />
              <div className="relative">
                <Icon
                  name="search"
                  size="md"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted"
                />
                <Input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={formatSearchMobilePlaceholder(currentCityLabel)}
                  aria-label="Buscar em tela cheia"
                  className="pl-11 pr-4"
                />
              </div>
              <div className={cn("mt-4 overflow-y-auto pb-10")}>
                {!query.trim() ? (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {quickTerms.map((term) => (
                      <ChipToggle
                        key={term}
                        onClick={() => setQuery(term)}
                      >
                        {term}
                      </ChipToggle>
                    ))}
                  </div>
                ) : null}
                <SearchResults items={items} onSelect={() => setQuery("")} tenantSlug={tenantSlug} useTenantPath={useTenantPath} />
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};
