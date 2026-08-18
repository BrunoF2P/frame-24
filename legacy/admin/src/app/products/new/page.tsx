"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SalesService } from "@/services/sales-services";

interface ProductCategory {
  id: string;
  name: string;
}

interface ProductFormData {
  name: string;
  product_code: string;
  description: string;
  category_id: string;
  unit: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    product_code: "",
    description: "",
    category_id: "",
    unit: "UN",
  });

  useEffect(() => {
    SalesService.getProductCategories()
      .then((data) => {
        setCategories(Array.isArray(data) ? (data as ProductCategory[]) : []);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await SalesService.createProduct(
        formData as unknown as Record<string, unknown>,
      );
      router.push("/products");
    } catch {
      alert("Erro ao criar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Novo Produto</h1>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-zinc-900 p-6 rounded-lg border border-zinc-800"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-zinc-400">Nome</label>
            <input
              className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Código (SKU)</label>
            <input
              className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white"
              value={formData.product_code}
              onChange={(e) =>
                setFormData({ ...formData, product_code: e.target.value })
              }
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-zinc-400">Categoria</label>
          <select
            className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white"
            value={formData.category_id}
            onChange={(e) =>
              setFormData({ ...formData, category_id: e.target.value })
            }
            required
          >
            <option value="">Selecione...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {categories.length === 0 && (
            <p className="text-xs text-yellow-500 mt-1">
              Você precisa criar categorias de produto antes (use script seed ou
              crie a tela)
            </p>
          )}
        </div>

        <button
          disabled={loading}
          className="w-full bg-accent-red py-3 rounded text-white font-bold hover:bg-red-600"
        >
          {loading ? "Salvando..." : "Salvar Produto"}
        </button>
      </form>
    </div>
  );
}
