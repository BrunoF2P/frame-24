"use client";

import { useEffect, useState } from "react";
import { SalesService } from "@/services/sales-services";
import { Plus, Trash2, Package } from "lucide-react";
import Link from "next/link";

interface ProductItem {
  id: string;
  name: string;
  product_code: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);

  useEffect(() => {
    SalesService.getProducts()
      .then((data) => {
        setProducts(Array.isArray(data) ? (data as ProductItem[]) : []);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Link
          href="/products/new"
          className="bg-accent-red px-4 py-2 rounded text-white flex gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Produto
        </Link>
      </div>
      <div className="bg-zinc-900/50 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Código</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-800/50">
                <td className="px-6 py-4 font-medium flex items-center gap-2">
                  <Package className="w-4 h-4 text-zinc-500" /> {p.name}
                </td>
                <td className="px-6 py-4 text-zinc-400">{p.product_code}</td>
                <td className="px-6 py-4 text-right text-zinc-500">
                  <Trash2 className="w-4 h-4 cursor-pointer hover:text-red-500" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
