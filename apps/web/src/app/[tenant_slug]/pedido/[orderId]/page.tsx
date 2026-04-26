import { OrderConfirmation } from "@/components/cinema/order-confirmation";

export default async function TenantOrderPage({
  params,
}: {
  params: Promise<{ tenant_slug: string; orderId: string }>;
}) {
  const { tenant_slug, orderId } = await params;

  return <OrderConfirmation reference={orderId} tenantSlug={tenant_slug} />;
}
