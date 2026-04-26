import { redirect } from "next/navigation";
import { resolvePublicTenantSlug } from "@/lib/resolve-public-tenant";

export default async function LegacyFinalizeRedirectPage({
  params,
}: {
  params: Promise<{ showtimeId: string }>;
}) {
  const tenantSlug = await resolvePublicTenantSlug();
  const { showtimeId } = await params;

  if (!tenantSlug) {
    redirect("/");
  }

  redirect(`/${tenantSlug}/compra/${showtimeId}`);
}
