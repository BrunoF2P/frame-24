import { redirect } from "next/navigation";
import { resolvePublicTenantSlug } from "@/lib/resolve-public-tenant";

export default async function PaymentStatusRedirectPage({
  params,
}: {
  params: Promise<{ checkoutId: string }>;
}) {
  const tenantSlug = await resolvePublicTenantSlug();
  const { checkoutId } = await params;

  if (!tenantSlug) {
    redirect("/");
  }

  redirect(`/${tenantSlug}/pagamento/${checkoutId}`);
}
