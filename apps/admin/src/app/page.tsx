"use client";

import { useMemo } from "react";
import { Users, Film, Ticket, TrendingUp } from "lucide-react";

interface DashboardStat {
  title: string;
  value: string;
  icon: typeof TrendingUp;
  color: string;
}

export default function DashboardPage() {
  const stats = useMemo<DashboardStat[]>(() => [
    {
      title: "Total de Vendas",
      value: "R$ 0,00",
      icon: TrendingUp,
      color: "text-green-500",
    },
    {
      title: "Usuários Ativos",
      value: "0",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Filmes em Cartaz",
      value: "0",
      icon: Film,
      color: "text-purple-500",
    },
    {
      title: "Ingressos Hoje",
      value: "0",
      icon: Ticket,
      color: "text-orange-500",
    },
  ], []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Dashboard
        </h2>
        <p className="text-zinc-400">Visão geral do sistema Frame24.</p>
      </header>

      {/* Grid de Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-sm font-medium text-zinc-400">
                {stat.title}
              </h3>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stat.value}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              +0% em relação ao mês passado
            </p>
          </div>
        ))}
      </div>

      {/* Área de Conteúdo Principal (Placeholder) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">
            Vendas Recentes
          </h3>
          <div className="h-[200px] flex items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
            Gráfico de Vendas (Em breve)
          </div>
        </div>
        <div className="col-span-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">
            Filmes Populares
          </h3>
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              Nenhum dado disponível no momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
