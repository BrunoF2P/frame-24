"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PosService, PosSession, PosTransaction } from "@/services/pos-service";
import {
  ArrowLeft,
  Loader2,
  Save,
  Calculator,
  XCircle,
  TrendingUp,
  TrendingDown,
  Receipt,
  DollarSign,
} from "lucide-react";
import Link from "next/link";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const transactionTypeLabels: Record<string, string> = {
  sale: "Venda",
  refund: "Estorno",
  discount: "Desconto",
  withdrawal: "Retirada",
  cash_in: "Reforço",
};

export default function PosSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();
  const [session, setSession] = useState<PosSession | null>(null);
  const [transactions, setTransactions] = useState<PosTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeData, setCloseData] = useState({
    cash_counted: 0,
    closing_notes: "",
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [sessionData, txData] = await Promise.all([
        PosService.getPosSessionById(id),
        PosService.getPosTransactionsBySession(id).catch(() => []),
      ]);
      setSession(sessionData);
      setTransactions(Array.isArray(txData) ? txData : []);
    } catch (error) {
      console.error("Erro ao carregar caixa:", error);
      alert("Caixa não encontrado.");
      router.push("/pos");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setClosing(true);
    try {
      await PosService.closePosSession(id, {
        cash_counted: Number(closeData.cash_counted),
        closing_notes: closeData.closing_notes || undefined,
      });
      router.push("/pos");
    } catch (error: unknown) {
      let msg = "Erro ao fechar caixa.";
      if (error && typeof error === "object" && "response" in error) {
        const resp = (error as { response?: { data?: { message?: unknown } } }).response;
        if (resp?.data?.message) {
          const m = resp.data.message;
          msg = Array.isArray(m) ? m.join(" | ") : String(m);
        }
      }
      alert(msg);
      console.error(error);
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-zinc-400 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando caixa...
      </div>
    );
  }

  if (!session) return null;

  const isOpen = session.status === "open";
  const expectedCash =
    session.opening_amount +
    session.total_sales_amount -
    session.total_refunds_amount -
    session.cash_withdrawn;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/pos"
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calculator className="w-6 h-6 text-accent-red" />
              {session.session_number}
            </h1>
            <p className="text-sm text-zinc-400">
              Aberto em {formatDateTime(session.opened_at)}
              {session.closed_at && ` · Fechado em ${formatDateTime(session.closed_at)}`}
            </p>
          </div>
        </div>
        {isOpen && !showCloseForm && (
          <button
            onClick={() => {
              setCloseData({ ...closeData, cash_counted: expectedCash });
              setShowCloseForm(true);
            }}
            className="bg-red-600 px-4 py-2 rounded-md text-white font-medium flex items-center gap-2 hover:bg-red-700 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Fechar Caixa
          </button>
        )}
      </div>

      {showCloseForm && (
        <form
          onSubmit={handleCloseSession}
          className="bg-zinc-900/80 border border-red-800/50 rounded-lg p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-red-400 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Fechamento do Caixa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1.5 text-zinc-400 font-medium">
                Valor Esperado em Espécie
              </label>
              <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-md text-zinc-300 text-sm">
                {formatCurrency(expectedCash)}
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1.5 text-zinc-400 font-medium">
                Valor Contado (R$) *
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-md text-white text-sm focus:border-accent-red outline-none"
                value={closeData.cash_counted}
                onChange={(e) =>
                  setCloseData({
                    ...closeData,
                    cash_counted: Number(e.target.value),
                  })
                }
                required
              />
              {closeData.cash_counted !== expectedCash && (
                <p
                  className={`text-xs mt-1 ${
                    closeData.cash_counted > expectedCash
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  Diferença:{" "}
                  {formatCurrency(closeData.cash_counted - expectedCash)}
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-zinc-400 font-medium">
              Observações
            </label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-md text-white text-sm min-h-20 focus:border-accent-red outline-none"
              value={closeData.closing_notes}
              onChange={(e) =>
                setCloseData({ ...closeData, closing_notes: e.target.value })
              }
              placeholder="Notas sobre o fechamento (opcional)..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowCloseForm(false)}
              className="px-4 py-2 rounded-md text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={closing}
              className="bg-red-600 px-6 py-2 rounded-md text-white font-bold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {closing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fechando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Confirmar Fechamento
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            Fundo de Troco
          </div>
          <p className="text-lg font-bold">
            {formatCurrency(session.opening_amount)}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Total Vendas
          </div>
          <p className="text-lg font-bold text-green-400">
            {formatCurrency(session.total_sales_amount)}
          </p>
          <p className="text-xs text-zinc-500">
            {session.total_sales_count} vendas
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            Estornos
          </div>
          <p className="text-lg font-bold text-red-400">
            {formatCurrency(session.total_refunds_amount)}
          </p>
          <p className="text-xs text-zinc-500">
            {session.total_refunds_count} estornos
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <Receipt className="w-3.5 h-3.5" />
            Total Recebido
          </div>
          <p className="text-lg font-bold text-emerald-400">
            {formatCurrency(session.total_received_amount)}
          </p>
        </div>
      </div>

      {session.difference !== null && (
        <div
          className={`rounded-lg p-4 border ${
            session.difference === 0
              ? "bg-green-950/30 border-green-800/50 text-green-400"
              : session.difference > 0
                ? "bg-blue-950/30 border-blue-800/50 text-blue-400"
                : "bg-red-950/30 border-red-800/50 text-red-400"
          }`}
        >
          <span className="font-medium">Diferença apurada: </span>
          {formatCurrency(session.difference)}
          {session.difference === 0 && " (Caixa bateu!)"}
          {session.difference > 0 && " (Sobra)"}
          {session.difference < 0 && " (Falta)"}
        </div>
      )}

      <div className="bg-zinc-900/50 border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Receipt className="w-4 h-4 text-zinc-400" />
          <h2 className="font-semibold text-foreground">
            Transações ({transactions.length})
          </h2>
        </div>
        {transactions.length === 0 ? (
          <div className="px-6 py-8 text-center text-zinc-500 text-sm">
            Nenhuma transação registrada nesta sessão
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Pagamento</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3 text-right">Valor</th>
                <th className="px-6 py-3 text-right">Troco</th>
                <th className="px-6 py-3">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-zinc-800/50">
                  <td className="px-6 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        tx.transaction_type === "sale"
                          ? "bg-green-900/40 text-green-400"
                          : tx.transaction_type === "refund"
                            ? "bg-red-900/40 text-red-400"
                            : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {transactionTypeLabels[tx.transaction_type] ||
                        tx.transaction_type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-zinc-300">
                    {tx.payment_method_name || tx.payment_method}
                  </td>
                  <td className="px-6 py-3 text-zinc-400 max-w-xs truncate">
                    {tx.description || "—"}
                  </td>
                  <td
                    className={`px-6 py-3 text-right font-medium ${
                      tx.transaction_type === "refund"
                        ? "text-red-400"
                        : "text-zinc-200"
                    }`}
                  >
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="px-6 py-3 text-right text-zinc-500">
                    {tx.change_amount > 0
                      ? formatCurrency(tx.change_amount)
                      : "—"}
                  </td>
                  <td className="px-6 py-3 text-zinc-500 text-xs">
                    {formatDateTime(tx.performed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
