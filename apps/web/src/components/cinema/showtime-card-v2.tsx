import Link from "next/link";
import type { Cinema, SessionGroup } from "@/types/storefront";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { FormatBadge } from "@/components/cinema/format-badge";
import { OccupancyIndicator } from "@/components/cinema/occupancy-indicator";
import { formatCurrency } from "@/lib/utils";
import { copy } from "@/lib/copy/catalog";

export const ShowtimeCardV2 = ({
  citySlug,
  session,
  cinema,
}: {
  citySlug: string;
  session: SessionGroup;
  cinema: Cinema;
}) => (
  <Card>
    <article className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-3">
        <header className="flex flex-wrap items-center gap-2">
          <FormatBadge label={session.format} />
          <span className="text-sm text-foreground-muted">{session.language} • {session.subtitle}</span>
        </header>
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-2xl font-semibold tracking-[-0.03em]">{session.time}</p>
          <span className="inline-flex items-center gap-2 text-sm text-foreground-muted">
            <Icon name="clock" size="xs" />
            {session.date}
          </span>
          <span className="inline-flex items-center gap-2 text-sm text-foreground-muted">
            <Icon name="mapPin" size="xs" />
            {cinema.name}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <OccupancyIndicator level={session.occupancy} />
          <span className="text-sm text-foreground-muted">Sala {session.room}</span>
          <span className="text-sm text-foreground-muted">{copy("movieCardPriceFromPrefix")} {formatCurrency(session.priceFrom)}</span>
        </div>
      </div>
      <Button asChild>
        <Link href={`/cidade/${citySlug}/sessao/${session.id}`}>Escolher assentos</Link>
      </Button>
    </article>
  </Card>
);
