import "server-only";

import { headers } from "next/headers";
import { getTenantSlugFromHost, normalizeHost } from "@/lib/tenant-routing";

const LOCAL_DEFAULT_TENANT = "lawtrel-admin";

export async function resolvePublicTenantSlug() {
  return resolveRequestedTenantSlug({ includeLocalDefault: true });
}

export async function resolveRequestedTenantSlug({
  includeLocalDefault = false,
}: {
  includeLocalDefault?: boolean;
} = {}) {
  const requestHeaders = await headers();
  const rawHost = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const host = normalizeHost(rawHost);
  const hostTenantSlug = getTenantSlugFromHost(host);
  if (hostTenantSlug) {
    return hostTenantSlug;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const resolveUrl = new URL(`${apiBase}/v1/public/tenants/resolve`);
  if (host) {
    resolveUrl.searchParams.set("host", host);
  }

  try {
    const response = await fetch(resolveUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (response.ok) {
      const payload = (await response.json()) as { tenant_slug?: string | null };
      if (payload.tenant_slug) {
        return payload.tenant_slug;
      }
    }
  } catch {
    // Keep local/demo fallbacks available when the API is not reachable.
  }

  if (includeLocalDefault) {
    return (
      process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ??
      (process.env.NODE_ENV !== "production" ? LOCAL_DEFAULT_TENANT : null) ??
      null
    );
  }

  return null;
}
