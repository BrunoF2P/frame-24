import type { DigitalTicket as DigitalTicketModel } from "@/types/storefront";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export const DigitalTicket = ({ ticket }: { ticket: DigitalTicketModel }) => (
  <Card className="overflow-hidden p-0">
    <div className="grid gap-6 md:grid-cols-[1fr_220px]">
      <div className="space-y-5 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-accent-red-300">Ticket digital</p>
          <h2 className="mt-2 font-display text-4xl">Seu ingresso já está com você</h2>
        </div>
        <div className="rounded-[var(--radius-md)] border border-dashed border-border p-4 text-sm text-foreground-muted">
          Código de barras: <span className="font-semibold text-foreground">{ticket.barcode}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="gold" size="sm" type="button">
            <Icon name="wallet" size="sm" />
            Adicionar à carteira
          </Button>
          <Button asChild size="sm" variant="secondary">
            <a href={ticket.walletUrl}>Abrir versão wallet</a>
          </Button>
        </div>
      </div>
      <div className="flex min-h-[220px] items-center justify-center bg-background-strong p-6">
        <div className="flex h-40 w-40 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-surface">
          <Icon name="qrCode" size={84} />
        </div>
      </div>
    </div>
  </Card>
);
