"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { authClient } from "@/lib/auth-client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isPending, setIsPending] = useState(true);

  const isLoginPage = pathname === "/login";
  const isReady = !isPending;
  const authenticated = !!session;

  useEffect(() => {
    const checkSession = async () => {
      setIsPending(true);
      try {
        const sessionData = await authClient.getSession();
        setSession(sessionData);
      } catch {
        setSession(null);
      } finally {
        setIsPending(false);
      }
    };

    void checkSession();
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!authenticated && !isLoginPage) {
      router.replace("/login");
      return;
    }

    if (authenticated && isLoginPage) {
      router.replace("/");
    }
  }, [authenticated, isLoginPage, isReady, router]);

  if (!isReady) {
    return (
      <main className="flex min-h-screen flex-1 items-center justify-center text-sm text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-accent-red/10 flex items-center justify-center animate-pulse">
            <div className="h-4 w-4 rounded bg-accent-red/20" />
          </div>
          Carregando...
        </div>
      </main>
    );
  }

  if (!authenticated && !isLoginPage) {
    return null;
  }

  return (
    <>
      {!isLoginPage && (
        <aside className="hidden w-60 border-r border-zinc-800/60 bg-zinc-950 md:flex flex-col">
          <Sidebar />
        </aside>
      )}

      <main className={`flex-1 overflow-y-auto ${!isLoginPage ? "p-8" : ""}`}>
        {children}
      </main>
    </>
  );
}
