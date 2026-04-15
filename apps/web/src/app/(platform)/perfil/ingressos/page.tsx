"use client";

import Link from "next/link";
import { ProfileAuthState } from "@/components/profile/profile-auth-state";
import { ProfileShell } from "@/components/profile/profile-shell";
import { useCustomerProfileQuery, useCustomerTicketsQuery } from "@/hooks/use-customer-profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { copy } from "@/lib/copy/catalog";

export default function ProfileTicketsPage() {
  const profileQuery = useCustomerProfileQuery();
  const ticketsQuery = useCustomerTicketsQuery();

  if (profileQuery.isLoading || ticketsQuery.isLoading) {
    return (
      <ProfileShell title={copy("profileTicketsTitle")} description={copy("profileTicketsDescription")}>
        <Card>{copy("profileTicketsLoading")}</Card>
      </ProfileShell>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ProfileShell title={copy("profileTicketsTitle")} description={copy("profileTicketsDescription")}>
        <ProfileAuthState />
      </ProfileShell>
    );
  }

  const tickets = ticketsQuery.data ?? [];

  return (
    <ProfileShell title={copy("profileTicketsTitle")} description={copy("profileTicketsDescription")}>
      <Card className="space-y-3">
        {tickets.length === 0 ? (
          <p className="text-sm text-foreground-muted">{copy("profileTicketsEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border p-3">
                <div>
                  <p className="font-medium">#{ticket.ticket_number}</p>
                  <p className="text-xs text-foreground-muted">
                    Pedido {ticket.sale.sale_number} ·{" "}
                    {new Date(ticket.sale.sale_date).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ticket.used ? "neutral" : "success"}>
                    {ticket.used ? "Utilizado" : "Ativo"}
                  </Badge>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/perfil/ingressos/${ticket.id}`}>{copy("profileTicketsOpen")}</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </ProfileShell>
  );
}
