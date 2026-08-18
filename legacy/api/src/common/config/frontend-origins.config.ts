import {
  extractTenantSlugFromHost,
  normalizeHost,
  normalizeOrigin,
} from '../utils/tenant-host.util';

type EnvLike = Record<string, string | undefined>;

const CANONICAL_DEV_FRONTEND_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3003',
  'http://127.0.0.1:3003',
  'http://localhost:3004',
  'http://127.0.0.1:3004',
  'http://172.25.248.81:3000',
  'http://172.25.248.81:3003',
  'http://172.25.248.81:3004',
];

const CANONICAL_DEV_TRUSTED_ORIGINS = [
  'http://*.localhost:3000',
  'http://*.lvh.me:3000',
];

function configuredFrontendOrigins(env: EnvLike): string[] {
  return (env.FRONTEND_URL ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

function tenantBaseDomains(env: EnvLike): string[] {
  return [env.TENANT_BASE_DOMAIN, env.NEXT_PUBLIC_TENANT_BASE_DOMAIN]
    .flatMap((value) => (value ?? '').split(','))
    .map(normalizeHost)
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function resolveAllowedFrontendOrigins(
  env: EnvLike = process.env,
): string[] {
  const devOrigins =
    env.NODE_ENV !== 'production' ? CANONICAL_DEV_FRONTEND_ORIGINS : [];

  return unique([...devOrigins, ...configuredFrontendOrigins(env)]);
}

export function getTrustedFrontendOrigins(
  env: EnvLike = process.env,
): string[] {
  const tenantOrigins = tenantBaseDomains(env).flatMap((domain) => [
    `https://*.${domain}`,
    `https://${domain}`,
    `http://*.${domain}`,
    `http://${domain}`,
  ]);
  const devOrigins =
    env.NODE_ENV !== 'production'
      ? [...CANONICAL_DEV_FRONTEND_ORIGINS, ...CANONICAL_DEV_TRUSTED_ORIGINS]
      : [];

  return unique([
    ...configuredFrontendOrigins(env),
    ...tenantOrigins,
    ...devOrigins,
  ]);
}

export function isAllowedFrontendOrigin(
  origin?: string | null,
  env: EnvLike = process.env,
): boolean {
  if (!origin) {
    return true;
  }

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }

  const normalized = normalizeOrigin(origin);
  if (resolveAllowedFrontendOrigins(env).includes(normalized)) {
    return true;
  }

  const hostname = normalizeHost(url.hostname);
  if (env.NODE_ENV !== 'production') {
    if (extractTenantSlugFromHost(hostname, [])) {
      return url.port === '3000';
    }
  }

  return tenantBaseDomains(env).some((domain) => {
    if (hostname === domain) {
      return url.protocol === 'https:' || url.protocol === 'http:';
    }

    return (
      hostname.endsWith(`.${domain}`) &&
      (url.protocol === 'https:' || url.protocol === 'http:')
    );
  });
}
