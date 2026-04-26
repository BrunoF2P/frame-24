import Link from "next/link";
import type { Cinema } from "@/types/storefront";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

export const CinemaStrip = ({
  cinemas,
  tenantSlug,
}: {
  cinemas: Cinema[];
  tenantSlug?: string;
}) => (
  <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" aria-label="Lista de cinemas disponíveis">
    {cinemas.map((cinema) => (
      <li key={cinema.id}>
        <Card className="space-y-4">
          <article>
            <header className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{cinema.name}</p>
                <p className="mt-1 text-sm text-foreground-muted">{cinema.network} • {cinema.neighborhood}</p>
              </div>
              <Badge variant="neutral">{cinema.formats[0]}</Badge>
            </header>
            <p className="text-sm text-foreground-muted">{cinema.address}</p>
            <ul className="flex flex-wrap gap-2" aria-label={`Recursos do cinema ${cinema.name}`}>
              {cinema.features.slice(0, 2).map((feature) => (
                <li key={feature}>
                  <Badge variant="neutral">{feature}</Badge>
                </li>
              ))}
            </ul>
            <Link
              href={`${tenantSlug ? `/${tenantSlug}` : ""}/cinema/${cinema.slug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent-red-500 hover:text-accent-red-600"
            >
              <Icon name="mapPin" size="xs" />
              Ver cinema
            </Link>
          </article>
        </Card>
      </li>
    ))}
  </ul>
);
