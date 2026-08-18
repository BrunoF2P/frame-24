"use client";

import Link from "next/link";
import { use } from "react";
import { usePathname } from "next/navigation";
import { OrderDetailsPanel } from "@/components/profile/order-details-panel";
import { ProfileAuthState } from "@/components/profile/profile-auth-state";
import { ProfileShell } from "@/components/profile/profile-shell";
import {
  useCustomerOrderQuery,
  useCustomerProfileQuery,
  useCustomerRefundRequestsQuery,
} from "@/hooks/use-customer-profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/catalog";
import { withTenantPath } from "@/lib/tenant-routing";

export default function ProfileOrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const pathname = usePathname();
  const profileQuery = useCustomerProfileQuery();
  const orderQuery = useCustomerOrderQuery(orderId);
  const refundQuery = useCustomerRefundRequestsQuery();

  if (profileQuery.isLoading || orderQuery.isLoading || refundQuery.isLoading) {
    return (
      <ProfileShell title={copy("profileOrderDetailsTitle")} description={copy("profileOrderDetailsDescription")}>
        <Card>{copy("profileOrderDetailsLoading")}</Card>
      </ProfileShell>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ProfileShell title={copy("profileOrderDetailsTitle")} description={copy("profileOrderDetailsDescription")}>
        <ProfileAuthState />
      </ProfileShell>
    );
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <ProfileShell title={copy("profileOrderDetailsTitle")} description={copy("profileOrderDetailsDescription")}>
        <Card className="space-y-3">
          <p className="text-sm text-foreground-muted">{copy("profileOrderDetailsNotFound")}</p>
          <Button asChild size="sm" variant="secondary">
            <Link href={withTenantPath(pathname, "/perfil/pedidos")}>{copy("profileOrderDetailsBackToOrders")}</Link>
          </Button>
        </Card>
      </ProfileShell>
    );
  }

  return (
    <ProfileShell title={copy("profileOrderDetailsTitle")} description={copy("profileOrderDetailsDescription")}>
      <div className="space-y-4">
        <Button asChild size="sm" variant="quiet">
          <Link href={withTenantPath(pathname, "/perfil/pedidos")}>{copy("profileOrderDetailsBackToOrders")}</Link>
        </Button>
        <OrderDetailsPanel order={orderQuery.data} refundRequests={refundQuery.data ?? []} />
      </div>
    </ProfileShell>
  );
}
