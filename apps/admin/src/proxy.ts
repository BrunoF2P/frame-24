import { NextResponse } from "next/server";
import type { NextMiddleware } from "next/server";

import { auth } from "./auth";

const proxyMiddleware = auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/api/auth");
  const isLoginRoute = pathname === "/login";
  const isLoggedIn = !!req.auth;

  if (isAuthRoute) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isLoginRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  if (isLoggedIn && isLoginRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
}) as unknown as NextMiddleware;

export default proxyMiddleware;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
