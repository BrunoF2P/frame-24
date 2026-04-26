import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, CheckCircle, Clock, Home, MapPin, ShoppingBag, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSaleDetails } from "@/lib/storefront/service";
import { formatDateLabelInTimeZone, formatTimeInTimeZone } from "@/lib/utils";

type TicketItem = {
  id: string;
  seat?: string;
  ticket_number?: string;
  ticket_types?: {
    name?: string;
  };
};

type ProductItem = {
  id: string;
  name: string;
};

type SaleData = {
  sale_number?: string;
  net_amount?: number | string;
  showtime_details?: {
    start_time: string;
    cinema_complexes?: { name?: string; timezone?: string | null };
    rooms?: { name?: string };
  };
  movie_details?: {
    title?: string;
    poster_url?: string;
  };
  products_details?: ProductItem[];
  tickets?: TicketItem[];
  concession_sales?: Array<{
    concession_sale_items: Array<{
      id: string;
      item_type?: string;
      item_id?: string;
      quantity?: number;
    }>;
  }>;
};

export async function OrderConfirmation({
  reference,
  tenantSlug,
}: {
  reference: string;
  tenantSlug: string;
}) {
  const sale = (await getSaleDetails(reference, tenantSlug).catch(() => null)) as SaleData | null;

  if (!sale) {
    notFound();
  }

  const showtime = sale.showtime_details;
  const movie = sale.movie_details;
  const showtimeTimeZone = showtime?.cinema_complexes?.timezone || undefined;
  const products = sale.products_details || [];
  const tickets = sale.tickets || [];
  const concessionSales = sale.concession_sales || [];
  const productItems: Array<{ id: string; quantity?: number; name: string }> = [];

  concessionSales.forEach((concessionSale) => {
    concessionSale.concession_sale_items.forEach((item) => {
      if (item.item_type !== "PRODUCT") {
        return;
      }

      const product = products.find((candidate) => candidate.id === item.item_id);
      if (product) {
        productItems.push({ ...item, name: product.name });
      }
    });
  });

  return (
    <main className="page-shell space-y-6 py-8 md:py-10">
      <header className="mx-auto max-w-2xl text-center">
        <div className="mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <CheckCircle className="h-10 w-10" />
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-accent-red-300">Pedido confirmado</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">Compra realizada com sucesso!</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Seu pagamento foi aprovado e seus ingressos já estão disponíveis.
        </p>
        <p className="mt-2 text-sm text-foreground-muted">Pedido #{sale.sale_number}</p>
      </header>

      {movie && showtime ? (
        <section className="mx-auto grid max-w-3xl overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface md:grid-cols-[9rem_1fr]">
          <div className="relative min-h-48 bg-background">
            {movie.poster_url ? (
              <Image
                src={movie.poster_url}
                alt={movie.title || "Poster"}
                fill
                sizes="144px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full min-h-48 items-center justify-center text-sm text-foreground-muted">
                Sem imagem
              </div>
            )}
          </div>
          <div className="space-y-4 p-5 md:p-6">
            <h2 className="text-2xl font-semibold text-foreground">{movie.title}</h2>
            <div className="grid gap-3 text-sm text-foreground-muted sm:grid-cols-3">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDateLabelInTimeZone(showtime.start_time, showtimeTimeZone)}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {formatTimeInTimeZone(showtime.start_time, showtimeTimeZone)}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {showtime.cinema_complexes?.name}
                {showtime.rooms?.name ? ` - ${showtime.rooms.name}` : ""}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {tickets.length > 0 ? (
        <section className="mx-auto max-w-3xl rounded-[var(--radius-lg)] border border-border bg-surface p-5 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Ticket className="h-5 w-5 text-accent-red-500" />
            <h2 className="text-xl font-semibold text-foreground">Ingressos</h2>
          </div>
          <ul className="space-y-3">
            {tickets.map((ticket) => (
              <li
                key={ticket.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-background p-3"
              >
                <div>
                  <p className="font-medium text-foreground">Assento {ticket.seat}</p>
                  <p className="text-xs text-foreground-muted">{ticket.ticket_types?.name}</p>
                </div>
                <p className="font-mono text-sm text-foreground-muted">{ticket.ticket_number}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {productItems.length > 0 ? (
        <section className="mx-auto max-w-3xl rounded-[var(--radius-lg)] border border-border bg-surface p-5 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-gold-500" />
            <h2 className="text-xl font-semibold text-foreground">Produtos</h2>
          </div>
          <ul className="space-y-3">
            {productItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm text-foreground">
                <span>{item.name}</span>
                <span className="font-semibold">{item.quantity}x</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mx-auto max-w-3xl rounded-[var(--radius-lg)] border border-border bg-surface p-5 md:p-6">
        <div className="flex items-center justify-between text-lg font-semibold text-foreground">
          <span>Total pago</span>
          <span className="text-emerald-400">
            R$ {Number(sale.net_amount || 0).toFixed(2).replace(".", ",")}
          </span>
        </div>
      </section>

      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row">
        <Button asChild className="flex-1" size="lg">
          <Link href={`/${tenantSlug}/perfil/pedidos`}>
            <Ticket className="h-4 w-4" />
            Ver meus pedidos
          </Link>
        </Button>
        <Button asChild className="flex-1" size="lg" variant="secondary">
          <Link href={`/${tenantSlug}`}>
            <Home className="h-4 w-4" />
            Voltar ao início
          </Link>
        </Button>
      </div>
    </main>
  );
}
