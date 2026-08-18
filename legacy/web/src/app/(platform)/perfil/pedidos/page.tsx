"use client";

import { useMemo, useState } from "react";
import { OrdersTableCard } from "@/components/profile/orders-table-card";
import { ProfileAuthState } from "@/components/profile/profile-auth-state";
import { ProfileShell } from "@/components/profile/profile-shell";
import { useCustomerOrdersQuery, useCustomerProfileQuery } from "@/hooks/use-customer-profile";
import { Card } from "@/components/ui/card";
import { ChipToggle } from "@/components/ui/chip-toggle";
import { copy } from "@/lib/copy/catalog";

type OrderFilter = "all" | "active" | "refundable";

export default function ProfileOrdersPage() {
  const profileQuery = useCustomerProfileQuery();
  const ordersQuery = useCustomerOrdersQuery();
  const [filter, setFilter] = useState<OrderFilter>("all");

  const filteredOrders = useMemo(() => {
    const orders = ordersQuery.data ?? [];
    if (filter === "active") {
      return orders.filter((order) => ["ABERTA", "ATIVA", "FINALIZADA"].includes((order.status || "").toUpperCase()));
    }
    if (filter === "refundable") {
      return orders.filter((order) => order.can_request_refund);
    }
    return orders;
  }, [filter, ordersQuery.data]);

  if (profileQuery.isLoading || ordersQuery.isLoading) {
    return (
      <ProfileShell
        title={copy("profileOrdersTitle")}
        description={copy("profileOrdersDescription")}
      >
        <Card>{copy("profileOrdersLoading")}</Card>
      </ProfileShell>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ProfileShell
        title={copy("profileOrdersTitle")}
        description={copy("profileOrdersDescription")}
      >
        <ProfileAuthState />
      </ProfileShell>
    );
  }

  return (
    <ProfileShell
      title={copy("profileOrdersTitle")}
      description={copy("profileOrdersDescription")}
    >
      <div className="space-y-4">
        <Card className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-foreground-muted">{copy("profileOrdersFilters")}</p>
          <div className="flex flex-wrap gap-2">
            <ChipToggle active={filter === "all"} onClick={() => setFilter("all")}>
              {copy("profileOrdersFilterAll")}
            </ChipToggle>
            <ChipToggle active={filter === "active"} onClick={() => setFilter("active")}>
              {copy("profileOrdersFilterActive")}
            </ChipToggle>
            <ChipToggle active={filter === "refundable"} onClick={() => setFilter("refundable")}>
              {copy("profileOrdersFilterRefundable")}
            </ChipToggle>
          </div>
        </Card>
        <OrdersTableCard orders={filteredOrders} />
      </div>
    </ProfileShell>
  );
}
