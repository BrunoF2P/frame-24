import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { DigitalTicket } from "@/components/cinema/digital-ticket";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatCurrency } from "@/lib/utils";
import { copy } from "@/lib/copy/catalog";

interface OrderCookiePayload {
  orderId: string;
  customerName: string;
  movieTitle: string;
  cinemaName: string;
  showtimeLabel: string;
  seatIds: string[];
  total: number;
  qrCode: string;
  walletUrl: string;
  barcode: string;
}

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const raw = (await cookies()).get("frame24-last-order")?.value;

  if (!raw) {
    notFound();
  }

  const order = JSON.parse(raw) as OrderCookiePayload;

  if (order.orderId !== orderId) {
    notFound();
  }

  return (
    <main className="page-shell space-y-8 py-10">
      <SectionHeading
        eyebrow={copy("orderEyebrow")}
        title={`Tudo certo, ${order.customerName}`}
        description={copy("orderDescription")}
      />
      <DigitalTicket
        ticket={{
          orderId: order.orderId,
          qrCode: order.qrCode,
          walletUrl: order.walletUrl,
          barcode: order.barcode,
        }}
      />
      <Card className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 text-sm text-foreground-muted">
          <p className="font-semibold text-foreground">{order.movieTitle}</p>
          <p>{order.cinemaName}</p>
          <p>{order.showtimeLabel}</p>
          <p>Assentos: {order.seatIds.join(", ")}</p>
        </div>
        <div className="space-y-2 text-sm text-foreground-muted md:text-right">
          <p>{copy("orderTotalPaid")}</p>
          <p className="font-display text-4xl text-foreground">{formatCurrency(order.total)}</p>
          <p>{copy("orderRefundHint")}</p>
        </div>
      </Card>
    </main>
  );
}
