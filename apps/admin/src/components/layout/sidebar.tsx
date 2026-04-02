"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Film,
  DollarSign,
  Settings,
  Package,
  LogOut,
  CalendarClock,
  Ticket,
  Popcorn,
  Truck,
} from "lucide-react";
import { getSession, signOut } from "next-auth/react";
import { buildOidcLogoutUrl } from "@/services/oidc-logout";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: CalendarClock, label: "Programação", href: "/schedule" },
  { icon: Film, label: "Catálogo de Filmes", href: "/catalog" },
  { icon: Popcorn, label: "Produtos & Combos", href: "/products" },
  { icon: Ticket, label: "Tipos de Ingresso", href: "/ticket-types" },
  { icon: Truck, label: "Fornecedores", href: "/suppliers" },
  { icon: Users, label: "Usuários & Identidade", href: "/identity" },
  { icon: DollarSign, label: "Financeiro", href: "/finance" },
  { icon: Package, label: "Estoque", href: "/stock" },
  { icon: Settings, label: "Configurações", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const postLogoutRedirectUrl =
      typeof window === "undefined"
        ? "/login"
        : `${window.location.origin}/login`;

    const session = await getSession();
    const logoutParams = {
      idToken: session?.idToken,
      postLogoutRedirectUrl,
    };

    await signOut({ redirect: false });
    window.location.assign(buildOidcLogoutUrl(logoutParams));
  };

  return (
    <div className="flex flex-col h-full py-4">
      {/* Cabeçalho da Sidebar */}
      <div className="px-6 mb-8">
        <h1 className="text-xl font-bold text-foreground">
          Frame24 <span className="text-accent-red">Admin</span>
        </h1>
      </div>

      {/* Navegação Principal */}
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? "bg-accent-red/10 text-accent-red"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Botão de Logout (Rodapé da Sidebar) */}
      <div className="px-4 mt-auto border-t border-zinc-800 pt-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-400 rounded-lg hover:bg-red-950/30 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </div>
  );
}
