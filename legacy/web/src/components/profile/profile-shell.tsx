"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { withTenantPath } from "@/lib/tenant-routing";
import { Icon } from "@/components/ui/icon";
import { copy } from "@/lib/copy/catalog";

const profileNavItems = [
  { href: "/perfil", label: "Visão geral", icon: "user" as const },
  { href: "/perfil/conta", label: "Conta", icon: "email" as const },
  { href: "/perfil/pedidos", label: "Pedidos", icon: "ticket" as const },
  { href: "/perfil/ingressos", label: "Ingressos", icon: "qrCode" as const },
  { href: "/perfil/seguranca", label: "Segurança", icon: "info" as const },
  { href: "/perfil/privacidade", label: "Privacidade", icon: "info" as const },
];

export const ProfileShell = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => {
  const pathname = usePathname();

  return (
    <main className="page-shell space-y-6 py-8 md:py-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-accent-red-300">{copy("profileEyebrow")}</p>
        <h1 className="font-display text-4xl text-foreground">{title}</h1>
        <p className="max-w-2xl text-sm text-foreground-muted">{description}</p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-[var(--radius-lg)] border border-border bg-surface p-2.5">
          <nav aria-label="Navegação de perfil" className="space-y-1">
            {profileNavItems.map((item) => {
              const href = withTenantPath(pathname, item.href);
              const isActive =
                pathname === href || (href !== withTenantPath(pathname, "/perfil") && pathname?.startsWith(href));

              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-foreground-muted",
                    isActive && "bg-background text-foreground",
                  )}
                >
                  <Icon name={item.icon} size="sm" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
};
