const RESERVED_TENANT_SUBDOMAINS = new Set([
  'admin',
  'api',
  'app',
  'assets',
  'cdn',
  'localhost',
  'static',
  'www',
]);

export function normalizeHost(value?: string | null): string {
  const raw = value ?? '';
  const withoutProtocol = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '');
  const firstSegment = withoutProtocol.split('/')[0] ?? '';
  return firstSegment.split(':')[0] ?? '';
}

export function normalizeOrigin(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) {
    return '';
  }

  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return raw.replace(/\/+$/, '').toLowerCase();
  }
}

export function getTenantBaseDomains(): string[] {
  return [
    process.env.TENANT_BASE_DOMAIN,
    process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN,
  ]
    .flatMap((value) => (value ?? '').split(','))
    .map(normalizeHost)
    .filter(Boolean);
}

export function getReservedTenantSubdomains(): Set<string> {
  const extra = (process.env.RESERVED_TENANT_SUBDOMAINS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...RESERVED_TENANT_SUBDOMAINS, ...extra]);
}

export function extractTenantSlugFromHost(
  host: string,
  baseDomains = getTenantBaseDomains(),
): string | null {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) {
    return null;
  }

  const reserved = getReservedTenantSubdomains();

  for (const baseDomain of baseDomains) {
    if (
      normalizedHost.endsWith(`.${baseDomain}`) &&
      normalizedHost !== baseDomain
    ) {
      const subdomain = normalizedHost.slice(0, -(baseDomain.length + 1));
      const tenantSlug = subdomain.split('.').pop() ?? '';
      return tenantSlug && !reserved.has(tenantSlug) ? tenantSlug : null;
    }
  }

  const localMatches = ['localhost', 'lvh.me'];
  for (const localDomain of localMatches) {
    if (
      normalizedHost.endsWith(`.${localDomain}`) &&
      normalizedHost !== localDomain
    ) {
      const tenantSlug = normalizedHost.slice(0, -(localDomain.length + 1));
      return tenantSlug && !reserved.has(tenantSlug) ? tenantSlug : null;
    }
  }

  return null;
}

export function isAllowedTenantOrigin(origin?: string | null): boolean {
  if (!origin) {
    return true;
  }

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  const protocol = url.protocol;
  const hostname = normalizeHost(url.hostname);

  if (protocol !== 'http:' && protocol !== 'https:') {
    return false;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return process.env.NODE_ENV !== 'production';
  }

  if (process.env.NODE_ENV !== 'production') {
    const localTenant = extractTenantSlugFromHost(hostname, []);
    if (localTenant) {
      return true;
    }
  }

  return !!extractTenantSlugFromHost(hostname);
}
