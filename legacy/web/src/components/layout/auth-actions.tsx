"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { withTenantPath } from "@/lib/tenant-routing";

export function AuthActions({
  tenantSlug,
}: {
  tenantSlug: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, hasSession, isLoading, logout } = useAuth();

  useEffect(() => {
    if (isLoading || !hasSession || isAuthenticated) {
      return;
    }

    const loginPath = withTenantPath(pathname, "/auth/login");
    const registerPath = withTenantPath(pathname, "/auth/register");
    const isOnLogin = pathname?.includes(loginPath) ?? false;
    const isOnRegister = pathname?.includes(registerPath) ?? false;

    if (isOnLogin || isOnRegister) {
      return;
    }

    const returnUrl =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : withTenantPath(pathname, "/");

    router.replace(
      withTenantPath(
        pathname,
        `/auth/register?intent=activate&returnUrl=${encodeURIComponent(returnUrl)}`,
      ),
    );
  }, [
    hasSession,
    isAuthenticated,
    isLoading,
    pathname,
    router,
    tenantSlug,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-9 w-16 animate-pulse rounded-[var(--radius-sm)] bg-zinc-800/80" />
        <div className="h-9 w-24 animate-pulse rounded-[var(--radius-sm)] bg-zinc-800/80" />
      </div>
    );
  }

  if (hasSession) {
    return (
      <div className="flex items-center gap-3">
        <Button type="button" onClick={logout} variant="quiet" size="sm">
          Sair
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button asChild variant="quiet" size="sm">
        <Link href={withTenantPath(pathname, "/auth/login")}>Entrar</Link>
      </Button>
      <Button asChild size="sm">
        <Link href={withTenantPath(pathname, "/auth/register")}>Cadastrar</Link>
      </Button>
    </>
  );
}
