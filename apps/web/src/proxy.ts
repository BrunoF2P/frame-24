import { NextResponse } from "next/server";
import type { NextMiddleware } from "next/server";

import { auth } from "./auth";

const proxyMiddleware = auth((req) => {
  const pathname = req.nextUrl.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const tenantSlug = segments[0];

  if (!req.auth && tenantSlug) {
    const loginUrl = new URL(`/${tenantSlug}/auth/login`, req.nextUrl.origin);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}) as unknown as NextMiddleware;

export default proxyMiddleware;

export const config = {
  matcher: ["/:tenant_slug/profile/:path*"],
};
