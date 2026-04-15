"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

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

    const isOnLogin = pathname?.includes(`/${tenantSlug}/auth/login`) ?? false;
    const isOnRegister =
      pathname?.includes(`/${tenantSlug}/auth/register`) ?? false;

    if (isOnLogin || isOnRegister) {
      return;
    }

    const returnUrl =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : `/${tenantSlug}`;

    router.replace(
      `/${tenantSlug}/auth/register?intent=activate&returnUrl=${encodeURIComponent(returnUrl)}`,
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
        <Link href={`/${tenantSlug}/auth/login`}>Entrar</Link>
      </Button>
      <Button asChild size="sm">
        <Link href={`/${tenantSlug}/auth/register`}>Cadastrar</Link>
      </Button>
    </>
  );
}
