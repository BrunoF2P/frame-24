"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { SalesService } from "@/services/sales-services";

export default function EditTicketTypePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    discount_percentage: 0,
  });

  useEffect(() => {
    async function loadTicketType() {
      try {
        const data = await SalesService.getTicketTypeById(id);
        setFormData({
          name: data.name || "",
          description: data.description || "",
          discount_percentage: Number(data.discount_percentage || 0),
        });
      } catch (error) {
        console.error("Erro ao carregar tipo de ingresso:", error);
        alert("Tipo de ingresso não encontrado.");
        router.push("/ticket-types");
      } finally {
        setLoading(false);
      }
    }

    loadTicketType();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await SalesService.updateTicketType(id, {
        name: formData.name,
        description: formData.description,
        discount_percentage: Number(formData.discount_percentage),
      });
      router.push("/ticket-types");
    } catch (error) {
      console.error("Erro ao atualizar tipo de ingresso:", error);
      alert("Erro ao atualizar tipo de ingresso.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-zinc-400">Carregando tipo de ingresso...</div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/ticket-types"
          className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar Tipo de Ingresso</h1>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-zinc-900 p-6 rounded-lg border border-zinc-800"
      >
        <div>
          <label className="block text-sm mb-1 text-zinc-400">
            Nome (Ex: Inteira, Meia)
          </label>
          <input
            className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-zinc-400">Descrição</label>
          <textarea
            className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white min-h-24"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-zinc-400">
            Desconto (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white"
            value={formData.discount_percentage}
            onChange={(e) =>
              setFormData({
                ...formData,
                discount_percentage: Number(e.target.value),
              })
            }
          />
        </div>

        <button
          disabled={saving}
          className="w-full bg-accent-red py-2 rounded text-white font-bold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Alterações
            </>
          )}
        </button>
      </form>
    </div>
  );
}
