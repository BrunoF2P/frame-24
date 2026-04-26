import { redirect } from "next/navigation";

export default async function LegacyTenantCheckoutRedirect({
  params,
}: {
  params: Promise<{ tenant_slug: string; checkoutId: string }>;
}) {
  const { tenant_slug, checkoutId } = await params;
  redirect(`/${tenant_slug}/pagamento/${checkoutId}`);
}
