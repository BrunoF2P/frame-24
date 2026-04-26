"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CustomerOrder } from "@/types/customer-profile";
import { formatCurrency, formatDateTimeInTimeZone } from "@/lib/utils";
import { withTenantPath } from "@/lib/tenant-routing";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { copy } from "@/lib/copy/catalog";

const orderStatusVariant: Record<string, "success" | "accent" | "neutral"> = {
  concluida: "success",
  finalizada: "success",
  cancelada: "neutral",
};

export const OrdersTableCard = ({ orders }: { orders: CustomerOrder[] }) => {
  const pathname = usePathname();

  if (orders.length === 0) {
    return (
      <Card className="space-y-2">
        <h2 className="text-xl font-semibold">{copy("profileOrdersCardTitle")}</h2>
        <p className="text-sm text-foreground-muted">
          {copy("profileOrdersEmpty")}
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{copy("profileOrdersCardTitle")}</h2>
        <p className="text-sm text-foreground-muted">{orders.length} pedido(s)</p>
      </header>
      <ul className="space-y-3">
        {orders.map((order) => (
          <li key={order.id} className="rounded-[var(--radius-md)] border border-border p-4">
            <article className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="space-y-1">
                <p className="font-semibold">
                  {order.movie?.title || "Filme"} · Pedido {order.sale_number}
                </p>
                <p className="text-sm text-foreground-muted">
                  {order.showtime?.cinema || "Cinema"} ·{" "}
                  {formatDateTimeInTimeZone(
                    order.showtime?.start_time || order.sale_date,
                    order.showtime?.timezone || undefined,
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={orderStatusVariant[(order.status || "").toLowerCase()] || "neutral"}>
                    {order.status || "Sem status"}
                  </Badge>
                  {order.can_request_refund ? (
                    <span className="inline-flex items-center gap-1 text-xs text-accent-red-300">
                      <Icon name="timer" size="xs" />
                      {copy("profileOrdersRefundAvailable")}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-3 md:justify-self-end">
                <p className="font-semibold text-foreground">
                  {formatCurrency(Number(order.net_amount))}
                </p>
                <Button asChild size="sm" variant="secondary">
                  <Link href={withTenantPath(pathname, `/perfil/pedidos/${order.id}`)}>
                    {copy("profileOrdersDetails")}
                    <Icon name="arrowRight" size="sm" />
                  </Link>
                </Button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </Card>
  );
};
