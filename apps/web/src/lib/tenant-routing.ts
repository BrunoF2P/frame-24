export const RESERVED_ROUTE_SEGMENTS = new Set([
  "auth",
  "busca",
  "checkout",
  "cidade",
  "cinema",
  "pedido",
  "perfil",
  "profile",
  "showtime",
]);

const RESERVED_TENANT_SUBDOMAINS = new Set([
  "admin",
  "api",
  "app",
  "assets",
  "cdn",
  "localhost",
  "static",
  "www",
]);

export const normalizeHost = (value?: string | null) => {
  const raw = value ?? "";
  const withoutProtocol = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "");
  const firstSegment = withoutProtocol.split("/")[0] ?? "";
  return firstSegment.split(":")[0] ?? "";
};

const tenantBaseDomains = () =>
  (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? process.env.TENANT_BASE_DOMAIN ?? "")
    .split(",")
    .map(normalizeHost)
    .filter(Boolean);

export const getTenantSlugFromHost = (host?: string | null) => {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) return null;

  for (const baseDomain of tenantBaseDomains()) {
    if (normalizedHost.endsWith(`.${baseDomain}`) && normalizedHost !== baseDomain) {
      const subdomain = normalizedHost.slice(0, -(baseDomain.length + 1));
      const slug = subdomain.split(".").pop() ?? "";
      return slug && !RESERVED_TENANT_SUBDOMAINS.has(slug) ? slug : null;
    }
  }

  for (const localDomain of ["localhost", "lvh.me"]) {
    if (normalizedHost.endsWith(`.${localDomain}`) && normalizedHost !== localDomain) {
      const slug = normalizedHost.slice(0, -(localDomain.length + 1));
      return slug && !RESERVED_TENANT_SUBDOMAINS.has(slug) ? slug : null;
    }
  }

  return null;
};

export const getTenantSlugFromPathname = (pathname?: string | null) => {
  const firstSegment = pathname?.split("/").filter(Boolean)[0]?.trim();
  if (!firstSegment || RESERVED_ROUTE_SEGMENTS.has(firstSegment)) {
    return null;
  }

  return firstSegment;
};

export const withTenantPath = (pathname: string | null | undefined, href: string) => {
  if (typeof window !== "undefined" && getTenantSlugFromHost(window.location.host)) {
    return href;
  }

  const tenantSlug = getTenantSlugFromPathname(pathname);
  if (!tenantSlug || !href.startsWith("/")) {
    return href;
  }

  return `/${tenantSlug}${href}`;
};
