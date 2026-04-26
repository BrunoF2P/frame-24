import { PlatformCheckoutExperience } from "@/components/cinema/platform-checkout-experience";

export default async function TenantShowtimePurchasePage({
  params,
}: {
  params: Promise<{ tenant_slug: string; showtimeId: string }>;
}) {
  const { tenant_slug, showtimeId } = await params;

  return <PlatformCheckoutExperience tenantSlug={tenant_slug} showtimeId={showtimeId} />;
}
