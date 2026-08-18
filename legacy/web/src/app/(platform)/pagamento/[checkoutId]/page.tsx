import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolvePublicTenantSlug } from "@/lib/resolve-public-tenant";
import { buildTenantPrefix, normalizeHost } from "@/lib/tenant-routing";

export default async function PaymentStatusRedirectPage({
  params,
}: {
  params: Promise<{ checkoutId: string }>;
}) {
  const tenantSlug = await resolvePublicTenantSlug();
  const { checkoutId } = await params;
  const requestHeaders = await headers();
  const rawHost = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const prefix = buildTenantPrefix(normalizeHost(rawHost), tenantSlug);

  if (!tenantSlug) {
    redirect("/");
  }

  redirect(`${prefix}/pagamento/${checkoutId}`);
}
