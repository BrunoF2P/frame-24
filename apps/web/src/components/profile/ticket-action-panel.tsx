"use client";

import { usePathname } from "next/navigation";
import type { TicketDetails } from "@/types/customer-profile";
import { extractErrorMessage } from "@/lib/error-utils";
import { customerApi } from "@/lib/api-client";
import { withTenantPath } from "@/lib/tenant-routing";
import { formatDateTimeInTimeZone } from "@/lib/utils";
import { useTicketResendEmailMutation } from "@/hooks/use-customer-profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { copy } from "@/lib/copy/catalog";

export const TicketActionPanel = ({ ticket }: { ticket: TicketDetails }) => {
  const pathname = usePathname();
  const resendMutation = useTicketResendEmailMutation();
  const ticketPayload = ticket.ticket_number;

  return (
    <Card className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-accent-red-300">{copy("profileTicketHeader")}</p>
        <h2 className="text-2xl font-semibold">{copy("profileTicketNumberPrefix")}{ticket.ticket_number}</h2>
        <p className="text-sm text-foreground-muted">
          Pedido {ticket.sale.sale_number} ·{" "}
          {formatDateTimeInTimeZone(ticket.sale.sale_date)}
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
        <div className="space-y-2 rounded-[var(--radius-md)] border border-dashed border-border p-4 text-sm text-foreground-muted">
          <p>{copy("profileTicketSeat")} <strong className="text-foreground">{ticket.seat || "Sem assento"}</strong></p>
          <p>{copy("profileTicketValue")} <strong className="text-foreground">R$ {Number(ticket.total_amount).toFixed(2)}</strong></p>
          <p>{copy("profileTicketStatus")} <strong className="text-foreground">{ticket.used ? copy("profileTicketStatusUsed") : copy("profileTicketStatusActive")}</strong></p>
        </div>
        <div className="mx-auto flex min-h-[220px] w-full max-w-[220px] items-center justify-center rounded-[var(--radius-md)] border border-border bg-white p-4 text-center text-zinc-950">
          <div className="space-y-2 break-all">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Payload</p>
            <p className="font-mono text-lg font-semibold">{ticketPayload}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <a href={customerApi.customerTicketDownloadPdfUrl(ticket.id)} rel="noreferrer" target="_blank">
            <Icon name="download" size="sm" />
            {copy("profileTicketDownloadPdf")}
          </a>
        </Button>
        <Button
          disabled={resendMutation.isPending}
          onClick={() => resendMutation.mutate(ticket.id)}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Icon name="email" size="sm" />
          {resendMutation.isPending ? copy("profileTicketResendingEmail") : copy("profileTicketResendEmail")}
        </Button>
        <Button asChild size="sm" variant="secondary">
          <a href={withTenantPath(pathname, `/perfil/pedidos/${ticket.sale.id}`)}>
            <Icon name="ticket" size="sm" />
            {copy("profileTicketViewInOrder")}
          </a>
        </Button>
      </div>
      {resendMutation.isError ? (
        <p className="text-sm text-foreground-muted">
          {extractErrorMessage(resendMutation.error, copy("profileTicketResendError"))}
        </p>
      ) : null}
      {resendMutation.isSuccess ? (
        <p className="text-sm text-foreground-muted">{copy("profileTicketResendSuccess")}</p>
      ) : null}
    </Card>
  );
};
