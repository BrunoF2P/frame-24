"use client";

import Link from "next/link";
import { use } from "react";
import { ProfileAuthState } from "@/components/profile/profile-auth-state";
import { ProfileShell } from "@/components/profile/profile-shell";
import { TicketActionPanel } from "@/components/profile/ticket-action-panel";
import { useCustomerProfileQuery, useCustomerTicketQuery } from "@/hooks/use-customer-profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/catalog";

export default function ProfileTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);
  const profileQuery = useCustomerProfileQuery();
  const ticketQuery = useCustomerTicketQuery(ticketId);

  if (profileQuery.isLoading || ticketQuery.isLoading) {
    return (
      <ProfileShell title={copy("profileTicketTitle")} description={copy("profileTicketDescription")}>
        <Card>{copy("profileTicketLoading")}</Card>
      </ProfileShell>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ProfileShell title={copy("profileTicketTitle")} description={copy("profileTicketDescription")}>
        <ProfileAuthState />
      </ProfileShell>
    );
  }

  if (ticketQuery.isError || !ticketQuery.data) {
    return (
      <ProfileShell title={copy("profileTicketTitle")} description={copy("profileTicketDescription")}>
        <Card className="space-y-3">
          <p className="text-sm text-foreground-muted">{copy("profileTicketNotFound")}</p>
          <Button asChild size="sm" variant="secondary">
            <Link href="/perfil/pedidos">{copy("profileTicketBackToOrders")}</Link>
          </Button>
        </Card>
      </ProfileShell>
    );
  }

  return (
    <ProfileShell title={copy("profileTicketTitle")} description={copy("profileTicketDescription")}>
      <div className="space-y-4">
        <Button asChild size="sm" variant="quiet">
          <Link href={`/perfil/pedidos/${ticketQuery.data.sale.id}`}>{copy("profileTicketBackToOrder")}</Link>
        </Button>
        <TicketActionPanel ticket={ticketQuery.data} />
      </div>
    </ProfileShell>
  );
}
