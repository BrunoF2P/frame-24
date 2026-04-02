"use client";

import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    const isAuthenticated = status === "authenticated";

    if (!isAuthenticated && !isLoginPage) {
      router.replace("/login");
      return;
    }

    if (status === "authenticated" && isLoginPage) {
      router.replace("/");
    }
  }, [isLoginPage, router, status]);

  return (
    <html lang="pt-BR" className="dark">
      <body className="flex h-screen overflow-hidden bg-background text-foreground">
        <>
          {!isLoginPage && (
            <aside className="hidden w-64 border-r border-border bg-zinc-900/50 md:block">
              <Sidebar />
            </aside>
          )}

          <main
            className={`flex-1 overflow-y-auto ${!isLoginPage ? "p-8" : ""}`}
          >
            {children}
          </main>
        </>
      </body>
    </html>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
