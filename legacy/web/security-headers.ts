type Header = {
  key: string;
  value: string;
};

type SecurityHeaderEnv = {
  nodeEnv?: string;
  apiUrl?: string;
  socketUrl?: string;
  authUrl?: string;
};

function originOf(value?: string): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function websocketOriginOf(value?: string): string | null {
  const origin = originOf(value);
  if (!origin) {
    return null;
  }

  return origin.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

export function buildSecurityHeaders({
  nodeEnv = process.env.NODE_ENV,
  apiUrl = process.env.NEXT_PUBLIC_API_URL,
  socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL,
  authUrl = process.env.NEXT_PUBLIC_AUTH_URL,
}: SecurityHeaderEnv = {}): Header[] {
  const isProduction = nodeEnv === "production";
  const connectSources = unique([
    "'self'",
    "https://*.frame24.com.br",
    "wss://*.frame24.com.br",
    "https://*.lawtrel.dev",
    "wss://*.lawtrel.dev",
    originOf(apiUrl),
    originOf(authUrl),
    originOf(socketUrl),
    websocketOriginOf(socketUrl),
    !isProduction ? "http://localhost:4000" : null,
    !isProduction ? "http://127.0.0.1:4000" : null,
    !isProduction ? "ws://localhost:4000" : null,
    !isProduction ? "ws://127.0.0.1:4000" : null,
  ]);

  const headers: Header[] = [
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    },
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://use.typekit.net",
        "font-src 'self' https://fonts.gstatic.com https://use.typekit.net data:",
        "img-src 'self' data: blob: https://images.unsplash.com https://image.tmdb.org https://*.frame24.com.br https://*.lawtrel.dev",
        `connect-src ${connectSources.join(" ")}`,
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    },
  ];

  if (isProduction) {
    headers.splice(5, 0, {
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains; preload",
    });
  }

  return headers;
}
