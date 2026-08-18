import { notFound } from "next/navigation";
import { PlatformCheckoutExperience } from "@/components/cinema/platform-checkout-experience";
import { resolvePublicTenantSlug } from "@/lib/resolve-public-tenant";

export default async function PurchaseStartPage({
  params,
}: {
  params: Promise<{ showtimeId: string }>;
}) {
  const tenantSlug = await resolvePublicTenantSlug();
  const { showtimeId } = await params;

  if (!tenantSlug) {
    notFound();
  }

  return <PlatformCheckoutExperience tenantSlug={tenantSlug} showtimeId={showtimeId} />;
}
