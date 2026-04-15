"use client";

import { useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import type { SearchItem } from "@/types/storefront";
import { Input } from "@/components/ui/input";
import { searchStorefront } from "@/lib/storefront/service";

export const SearchSuggest = ({
  initialItems,
}: {
  initialItems: SearchItem[];
}) => {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>(initialItems);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const results = await searchStorefront(deferredQuery);
      if (!cancelled) {
        setItems(results);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [deferredQuery]);

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filmes, cinemas, cidades"
        aria-label="Buscar filmes, cinemas e cidades"
      />
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={`${item.type}-${item.id}`}
            href={item.href}
            className="glass-panel block rounded-[var(--radius-md)] border border-border p-4 hover:border-accent-red-500/40"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-accent-red-300">{item.type}</p>
            <p className="mt-2 text-lg font-semibold">{item.title}</p>
            <p className="text-sm text-foreground-muted">{item.subtitle}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};
