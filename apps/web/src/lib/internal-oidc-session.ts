type SessionStatusCacheEntry = {
  active: boolean;
  expiresAt: number;
};

type SessionMetadata = {
  sid?: string;
  sub?: string;
  exp?: number;
};

const INTERNAL_STATUS_TTL_MS = 5_000;
const sessionStatusCache = new Map<string, SessionStatusCacheEntry>();

function getApiBaseUrl() {
  return process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

function getInternalSecret() {
  return (
    process.env.OIDC_INTERNAL_SECRET ??
    process.env.AUTH_INTERNAL_SECRET ??
    "frame24-oidc-internal-dev-secret"
  );
}

export function extractSessionMetadata(idToken?: string): SessionMetadata {
  if (!idToken) {
    return {};
  }

  const [, payload] = idToken.split(".");
  if (!payload) {
    return {};
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionMetadata;
    return parsed;
  } catch {
    return {};
  }
}

export async function registerOidcSession(params: {
  subject: string;
  sessionId: string;
  context: "EMPLOYEE" | "CUSTOMER";
  expiresAt?: number;
}) {
  await fetch(`${getApiBaseUrl()}/v1/internal/oidc/sessions/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-frame24-internal-secret": getInternalSecret(),
    },
    body: JSON.stringify({
      subject: params.subject,
      session_id: params.sessionId,
      context: params.context,
      expires_at:
        typeof params.expiresAt === "number"
          ? new Date(params.expiresAt * 1000).toISOString()
          : undefined,
    }),
    cache: "no-store",
  });
}

export async function isOidcSessionActive(params: {
  subject?: string;
  sessionId?: string;
}) {
  const cacheKey = `${params.subject ?? ""}:${params.sessionId ?? ""}`;
  const cached = sessionStatusCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.active;
  }

  const url = new URL(`${getApiBaseUrl()}/v1/internal/oidc/sessions/status`);
  if (params.subject) {
    url.searchParams.set("subject", params.subject);
  }
  if (params.sessionId) {
    url.searchParams.set("session_id", params.sessionId);
  }

  const response = await fetch(url, {
    headers: {
      "x-frame24-internal-secret": getInternalSecret(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to validate OIDC session: ${response.status}`);
  }

  const data = (await response.json()) as { active?: boolean };
  const active = data.active === true;

  sessionStatusCache.set(cacheKey, {
    active,
    expiresAt: now + INTERNAL_STATUS_TTL_MS,
  });

  return active;
}

export async function revokeOidcSessionFromBackchannel(params: {
  logoutToken: string;
  expectedAudience: string;
  issuer?: string;
}) {
  const response = await fetch(`${getApiBaseUrl()}/v1/internal/oidc/sessions/backchannel-logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-frame24-internal-secret": getInternalSecret(),
    },
    body: JSON.stringify({
      logout_token: params.logoutToken,
      expected_audience: params.expectedAudience,
      issuer: params.issuer,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Failed to revoke OIDC session: ${response.status} ${responseText}`,
    );
  }
}
