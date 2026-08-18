import { redirect } from "next/navigation";

export default async function LegacyTenantFinalizeRedirect({
  params,
}: {
  params: Promise<{ tenant_slug: string; showtimeId: string }>;
}) {
  const { tenant_slug, showtimeId } = await params;
  redirect(`/${tenant_slug}/compra/${showtimeId}`);
}
