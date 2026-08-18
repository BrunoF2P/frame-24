import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { OrderConfirmation } from "@/components/cinema/order-confirmation";
import { resolvePublicTenantSlug } from "@/lib/resolve-public-tenant";
import { buildTenantPrefix, normalizeHost } from "@/lib/tenant-routing";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const tenantSlug = await resolvePublicTenantSlug();
  const { orderId } = await params;
  const requestHeaders = await headers();
  const rawHost = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const useTenantPath = !buildTenantPrefix(normalizeHost(rawHost), tenantSlug) ? false : !!tenantSlug;

  if (!tenantSlug) {
    notFound();
  }

  return <OrderConfirmation reference={orderId} tenantSlug={tenantSlug} useTenantPath={useTenantPath} />;
}
