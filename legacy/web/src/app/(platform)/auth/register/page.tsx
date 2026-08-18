import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolvePublicTenantSlug } from "@/lib/resolve-public-tenant";
import { buildTenantPrefix, normalizeHost } from "@/lib/tenant-routing";

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

  const requestHeaders = await headers();
  const rawHost = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const prefix = buildTenantPrefix(normalizeHost(rawHost), tenantSlug);

  redirect(`${prefix}/auth/register${query.size ? `?${query}` : ""}`);
}
