"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SalesService } from "@/services/sales-services";

export default function NewTicketTypePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    discount_percentage: 0,
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await SalesService.createTicketType({
        name: formData.name,
        description: formData.description,
        discount_percentage: Number(formData.discount_percentage),
      });

      router.push("/ticket-types");
    } catch (error) {
      alert("Erro ao salvar");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Novo Tipo de Ingresso</h1>
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
          <label className="block text-sm mb-1 text-zinc-400">
            Desconto (%)
          </label>
          <input
            type="number"
            className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white"
            value={formData.discount_percentage}
            onChange={(e) =>
              setFormData({
                ...formData,
                discount_percentage: Number(e.target.value),
              })
            }
          />
          <p className="text-xs text-zinc-500 mt-1">
            0 para Inteira, 50 para Meia.
          </p>
        </div>
        <button
          disabled={loading}
          className="w-full bg-accent-red py-2 rounded text-white font-bold hover:bg-red-600"
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
