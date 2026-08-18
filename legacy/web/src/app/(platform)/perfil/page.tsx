"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProfileAuthState } from "@/components/profile/profile-auth-state";
import { ProfileShell } from "@/components/profile/profile-shell";
import {
  useCustomerOrdersQuery,
  useCustomerProfileQuery,
  useCustomerSecuritySessionsQuery,
} from "@/hooks/use-customer-profile";
import { formatCurrency } from "@/lib/utils";
import { withTenantPath } from "@/lib/tenant-routing";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { copy, formatProfileActiveSessionsLabel, formatProfileOverviewTitle } from "@/lib/copy/catalog";

export default function ProfileOverviewPage() {
  const pathname = usePathname();
  const profileQuery = useCustomerProfileQuery();
  const ordersQuery = useCustomerOrdersQuery();
  const sessionsQuery = useCustomerSecuritySessionsQuery();

  if (profileQuery.isLoading || ordersQuery.isLoading || sessionsQuery.isLoading) {
    return (
      <ProfileShell
        title={copy("profileOverviewFallbackTitle")}
        description={copy("profileOverviewDescription")}
      >
        <Card>{copy("profileOverviewLoading")}</Card>
      </ProfileShell>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ProfileShell
        title={copy("profileOverviewFallbackTitle")}
        description={copy("profileOverviewDescription")}
      >
        <ProfileAuthState />
      </ProfileShell>
    );
  }

  const profile = profileQuery.data;
  const orders = ordersQuery.data ?? [];
  const activeSessions = sessionsQuery.data ?? [];
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.net_amount), 0);
  const activeTickets = orders
    .flatMap((order) => order.order_items)
    .filter((item) => item.item_type === "ticket")
    .length;

  return (
    <ProfileShell
      title={formatProfileOverviewTitle(profile.full_name.split(" ")[0] || "cliente")}
      description={copy("profileOverviewDescription")}
    >
      <div className="space-y-4">
        <Card className="grid gap-3 sm:grid-cols-3">
          <article className="space-y-1">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-foreground-muted">
              <Icon name="ticket" size="xs" />
              {copy("profileOverviewStatsOrders")}
            </p>
            <p className="text-2xl font-semibold">{orders.length}</p>
          </article>
          <article className="space-y-1">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-foreground-muted">
              <Icon name="film" size="xs" />
              {copy("profileOverviewStatsTickets")}
            </p>
            <p className="text-2xl font-semibold">{activeTickets}</p>
          </article>
          <article className="space-y-1">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-foreground-muted">
              <Icon name="creditCard" size="xs" />
              {copy("profileOverviewStatsTotalPaid")}
            </p>
            <p className="text-2xl font-semibold">{formatCurrency(totalSpent)}</p>
          </article>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-xl font-semibold">{copy("profileOverviewQuickActions")}</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={withTenantPath(pathname, "/perfil/pedidos")}>{copy("profileOverviewActionOrders")}</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={withTenantPath(pathname, "/perfil/conta")}>{copy("profileOverviewActionEditAccount")}</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={withTenantPath(pathname, "/perfil/seguranca")}>{formatProfileActiveSessionsLabel(activeSessions.length)}</Link>
            </Button>
          </div>
        </Card>

        <Card className="space-y-2">
          <h2 className="text-xl font-semibold">{copy("profileOverviewLinksTitle")}</h2>
          {profile.linked_companies.length === 0 ? (
            <p className="text-sm text-foreground-muted">{copy("profileOverviewLinksEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {profile.linked_companies.map((company) => (
                <li key={company.company_id} className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border p-3">
                  <div>
                    <p className="font-medium">{company.company_name || "Cinema vinculado"}</p>
                    <p className="text-xs text-foreground-muted">
                      {company.tenant_slug ? `/${company.tenant_slug}` : copy("profileOverviewTenantUnavailable")}
                    </p>
                  </div>
                  <p className="text-xs text-foreground-muted">
                    {company.loyalty_level || copy("profileOverviewLevelFallback")} · {company.accumulated_points ?? 0} pts
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </ProfileShell>
  );
}
