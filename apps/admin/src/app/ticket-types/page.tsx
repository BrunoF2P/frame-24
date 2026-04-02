"use client";

import { useEffect, useState } from "react";
import { SalesService } from "@/services/sales-services";
import { Edit2, Plus, Trash2, Ticket } from "lucide-react";
import Link from "next/link";

interface TicketTypeItem {
  id: string;
  name: string;
  discount_percentage: number;
}

export default function TicketTypesPage() {
  const [types, setTypes] = useState<TicketTypeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await SalesService.getTicketTypes();
      setTypes(Array.isArray(data) ? (data as TicketTypeItem[]) : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este tipo de ingresso?")) return;
    await SalesService.deleteTicketType(id);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">
          Tipos de Ingresso
        </h1>
        <Link
          href="/ticket-types/new"
          className="bg-accent-red px-4 py-2 rounded text-white flex gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Tipo
        </Link>
      </div>

      <div className="bg-zinc-900/50 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Desconto (%)</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-zinc-500">
                  Carregando...
                </td>
              </tr>
            ) : types.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-800/50">
                <td className="px-6 py-4 font-medium flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-zinc-500" /> {t.name}
                </td>
                <td className="px-6 py-4">{t.discount_percentage}%</td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/ticket-types/${t.id}`}
                    className="inline-flex text-zinc-400 hover:text-white mr-3"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
