import { notFound } from "next/navigation";
import { OrderConfirmation } from "@/components/cinema/order-confirmation";
import { resolvePublicTenantSlug } from "@/lib/resolve-public-tenant";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const tenantSlug = await resolvePublicTenantSlug();
  const { orderId } = await params;

  if (!tenantSlug) {
    notFound();
  }

  return <OrderConfirmation reference={orderId} tenantSlug={tenantSlug} />;
}
