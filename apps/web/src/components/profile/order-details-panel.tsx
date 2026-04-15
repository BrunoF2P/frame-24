import Link from "next/link";
import type { CustomerOrder, RefundRequest } from "@/types/customer-profile";
import { formatCurrency } from "@/lib/utils";
import { RefundStatusBadge } from "@/components/profile/refund-status-badge";
import { RefundRequestModal } from "@/components/profile/refund-request-modal";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/catalog";

export const OrderDetailsPanel = ({
  order,
  refundRequests,
}: {
  order: CustomerOrder;
  refundRequests: RefundRequest[];
}) => {
  const relatedRefunds = refundRequests.filter((request) => request.order_id === order.id);

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">
              Pedido {order.sale_number} · {order.movie?.title || "Filme"}
            </h2>
            <p className="text-sm text-foreground-muted">
              {order.showtime?.cinema || "Cinema"} ·{" "}
              {order.showtime?.start_time
                ? new Date(order.showtime.start_time).toLocaleString("pt-BR")
                : new Date(order.sale_date).toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{order.status || copy("profileOrderDetailsNoStatus")}</Badge>
            <RefundRequestModal order={order} />
          </div>
        </header>
        <ul className="space-y-2">
          {order.order_items.map((item) => (
            <li key={item.id} className="rounded-[var(--radius-md)] border border-border p-3">
              <article className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="space-y-1">
                  <p className="font-medium">
                    {item.label} · {item.quantity}x
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {item.item_type === "ticket" ? copy("profileOrderDetailsTicketType") : copy("profileOrderDetailsConcessionType")}
                  </p>
                  {item.item_type === "ticket" ? (
                    <Button asChild size="sm" variant="quiet">
                      <Link href={`/perfil/ingressos/${item.reference_id}`}>{copy("profileOrderDetailsOpenTicket")}</Link>
                    </Button>
                  ) : null}
                  {!item.refund_eligibility.eligible && item.refund_eligibility.reason ? (
                    <p className="text-xs text-foreground-muted">{item.refund_eligibility.reason}</p>
                  ) : null}
                </div>
                <p className="font-semibold md:justify-self-end">
                  {formatCurrency(Number(item.total_amount))}
                </p>
              </article>
            </li>
          ))}
        </ul>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-sm text-foreground-muted">{copy("profileOrderDetailsPaymentMethod")} {order.payment_method || "N/A"}</p>
          <p className="text-lg font-semibold">{formatCurrency(Number(order.net_amount))}</p>
        </footer>
      </Card>
      <Card className="space-y-3">
        <h3 className="text-lg font-semibold">{copy("profileOrderDetailsRefundRequests")}</h3>
        {relatedRefunds.length === 0 ? (
          <p className="text-sm text-foreground-muted">
            {copy("profileOrderDetailsRefundEmpty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {relatedRefunds.map((request) => (
              <li key={request.request_id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border p-3">
                <div>
                  <p className="text-sm font-medium">#{request.request_id.slice(0, 8)}</p>
                  <p className="text-xs text-foreground-muted">
                    {new Date(request.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <RefundStatusBadge status={request.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
