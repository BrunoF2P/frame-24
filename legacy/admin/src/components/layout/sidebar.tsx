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
  Calculator,
  DoorOpen,
  Clapperboard,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

const menuItems = [
  { icon: LayoutDashboard, label: "Painel", href: "/" },
  { icon: CalendarClock, label: "Programação", href: "/schedule" },
  { icon: DoorOpen, label: "Salas & Complexos", href: "/rooms" },
  { icon: Film, label: "Catálogo de Filmes", href: "/catalog" },
  { icon: Popcorn, label: "Produtos & Combos", href: "/products" },
  { icon: Ticket, label: "Tipos de Ingresso", href: "/ticket-types" },
  { icon: Truck, label: "Fornecedores", href: "/suppliers" },
  { icon: Calculator, label: "Frente de Caixa", href: "/pos" },
  { icon: Users, label: "Usuários & Identidade", href: "/identity" },
  { icon: DollarSign, label: "Financeiro", href: "/finance" },
  { icon: Package, label: "Estoque", href: "/stock" },
  { icon: Settings, label: "Configurações", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } finally {
      router.replace("/login");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 px-5 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-red/10 border border-accent-red/20">
            <Clapperboard className="h-5 w-5 text-accent-red" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">
              Frame24
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-accent-red font-semibold">
              Cinema Admin
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-accent-red/10 text-accent-red shadow-[inset_3px_0_0_var(--accent-red)]"
                  : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
              }`}
            >
              <item.icon
                className={`h-4 w-4 transition-transform duration-200 ${
                  isActive
                    ? "text-accent-red"
                    : "text-zinc-500 group-hover:text-zinc-300 group-hover:scale-110"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-zinc-800/60 px-3 py-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-all duration-200 hover:bg-red-950/30 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );
}
