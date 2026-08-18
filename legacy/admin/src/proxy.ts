import { NextRequest, NextResponse } from "next/server";

const AUTH_BASE_URL =
  process.env.AUTH_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_AUTH_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

const ADMIN_BASE_PATH = process.env.NEXT_PUBLIC_ADMIN_BASE_PATH
  ? `/${process.env.NEXT_PUBLIC_ADMIN_BASE_PATH}`
  : '';

function buildLoginRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL(`${ADMIN_BASE_PATH}/login`, request.url);
  const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(loginUrl);
}

async function hasActiveSession(request: NextRequest): Promise<boolean> {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return false;
  }

  const sessionResponse = await fetch(`${AUTH_BASE_URL}/v1/auth/session`, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
      "x-company-id": request.headers.get("x-company-id") || "",
      "x-tenant-slug": request.headers.get("x-tenant-slug") || "",
    },
    cache: "no-store",
  });

  if (!sessionResponse.ok) {
    return false;
  }

  const payload = (await sessionResponse.json()) as {
    user?: { id?: string };
    session?: { id?: string };
  } | null;

  return !!payload?.user?.id && !!payload?.session?.id;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const internalPathname = ADMIN_BASE_PATH
    ? pathname.replace(ADMIN_BASE_PATH, '') || '/'
    : pathname;
  const isLoginRoute = internalPathname === "/login";

  const authenticated = await hasActiveSession(request);

  if (!authenticated && !isLoginRoute) {
    return buildLoginRedirect(request);
  }

  if (authenticated && isLoginRoute) {
    return NextResponse.redirect(new URL(`${ADMIN_BASE_PATH}/`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
