import { redirect } from "next/navigation";
import { resolvePublicTenantSlug } from "@/lib/resolve-public-tenant";

export default async function PlatformRegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const tenantSlug = await resolvePublicTenantSlug();
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
    }
  }

  redirect(`/${tenantSlug}/auth/register${query.size ? `?${query}` : ""}`);
}
