"use client";

import { useEffect, useState } from "react";
import { PosService, PosSession } from "@/services/pos-service";
import {
  Calculator,
  Plus,
  CheckCircle2,
  XCircle,
  Pause,
  Clock,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: "Aberta", color: "text-green-400", icon: CheckCircle2 },
  closed: { label: "Fechada", color: "text-zinc-500", icon: XCircle },
  suspended: { label: "Suspensa", color: "text-yellow-400", icon: Pause },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PosSessionsPage() {
  const [sessions, setSessions] = useState<PosSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      const data = await PosService.getPosSessions(
        statusFilter ? { status: statusFilter } : undefined,
      );
      setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = statusFilter
    ? sessions
    : sessions;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Calculator className="w-6 h-6 text-accent-red" />
          Frente de Caixa
        </h1>
        <Link
          href="/pos/new"
          className="bg-accent-red px-4 py-2 rounded text-white flex gap-2 items-center"
        >
          <Plus className="w-4 h-4" />
          Abrir Caixa
        </Link>
      </div>

      <div className="flex gap-2">
        {[
          { value: "", label: "Todas" },
          { value: "open", label: "Abertas" },
          { value: "closed", label: "Fechadas" },
          { value: "suspended", label: "Suspensas" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              statusFilter === f.value
                ? "bg-accent-red text-white border-accent-red"
                : "bg-zinc-950 border-zinc-700 text-zinc-400 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900/50 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-6 py-4">Sessão</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Abertura</th>
              <th className="px-6 py-4 text-right">Fundo de Troco</th>
              <th className="px-6 py-4 text-right">Vendas</th>
              <th className="px-6 py-4 text-right">Total Recebido</th>
              <th className="px-6 py-4">Aberto em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                  Carregando...
                </td>
              </tr>
            ) : filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                  Nenhum caixa encontrado
                </td>
              </tr>
            ) : (
              filteredSessions.map((s) => {
                const cfg = statusConfig[s.status] || {
                  label: s.status_name || s.status,
                  color: "text-zinc-400",
                  icon: Clock,
                };
                const Icon = cfg.icon;
                return (
                  <tr key={s.id} className="hover:bg-zinc-800/50">
                    <td className="px-6 py-4 font-medium">
                      <Link
                        href={`/pos/${s.id}`}
                        className="hover:text-accent-red transition-colors"
                      >
                        {s.session_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 ${cfg.color}`}>
                        <Icon className="w-4 h-4" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {formatCurrency(s.opening_amount)}
                    </td>
                    <td className="px-6 py-4 text-right text-zinc-300">
                      {formatCurrency(s.opening_amount)}
                    </td>
                    <td className="px-6 py-4 text-right text-zinc-300">
                      {s.total_sales_count} ({formatCurrency(s.total_sales_amount)})
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-green-400">
                      {formatCurrency(s.total_received_amount)}
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-xs">
                      {formatDateTime(s.opened_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {sessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Total Recebido (Todas)
            </div>
            <p className="text-xl font-bold text-green-400">
              {formatCurrency(
                sessions.reduce((acc, s) => acc + s.total_received_amount, 0),
              )}
            </p>
          </div>
          <div className="bg-zinc-900/50 border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <Calculator className="w-4 h-4" />
              Sessões Abertas
            </div>
            <p className="text-xl font-bold text-white">
              {sessions.filter((s) => s.status === "open").length}
            </p>
          </div>
          <div className="bg-zinc-900/50 border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <CheckCircle2 className="w-4 h-4" />
              Sessões Fechadas
            </div>
            <p className="text-xl font-bold text-white">
              {sessions.filter((s) => s.status === "closed").length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
