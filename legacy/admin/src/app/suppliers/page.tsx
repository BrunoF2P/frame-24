"use client";

import { useEffect, useState } from "react";
import { SuppliersService } from "@/services/suppliers-service";
import {
  Plus,
  Edit2,
  Trash2,
  Truck,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
} from "lucide-react";
import Link from "next/link";

interface Supplier {
  id: string;
  corporate_name: string;
  trade_name: string;
  cnpj: string;
  phone: string;
  email: string;
  is_film_distributor: boolean;
  active: boolean;
  [key: string]: unknown;
}

interface SupplierType {
  id: string;
  name: string;
  [key: string]: unknown;
}

type FilterTab = "all" | "distributors" | "active";

function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await SuppliersService.getAll();
      setSuppliers(Array.isArray(data) ? (data as Supplier[]) : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o fornecedor "${name}"?`))
      return;

    try {
      await SuppliersService.delete(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error(error);
      alert("Não foi possível excluir o fornecedor.");
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      s.corporate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.trade_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cnpj.includes(searchTerm);

    if (!matchesSearch) return false;

    if (activeTab === "distributors") return s.is_film_distributor;
    if (activeTab === "active") return s.active;
    return true;
  });

  const tabs: { value: FilterTab; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "distributors", label: "Distribuidores" },
    { value: "active", label: "Ativos" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Truck className="w-6 h-6 text-accent-red" />
            Fornecedores
          </h1>
          <p className="text-sm text-zinc-400">
            Gerencie os fornecedores e distribuidoras cadastrados
          </p>
        </div>
        <Link
          href="/suppliers/new"
          className="flex items-center gap-2 bg-accent-red hover:bg-accent-red-hover text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Fornecedor
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                activeTab === tab.value
                  ? "bg-accent-red text-white border-accent-red"
                  : "bg-zinc-950 border-zinc-700 text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center gap-2 bg-zinc-900/50 p-2 rounded-lg border border-border">
          <Search className="w-5 h-5 text-zinc-500 ml-2" />
          <input
            type="text"
            placeholder="Buscar por nome ou CNPJ..."
            className="bg-transparent border-none focus:outline-none text-zinc-200 w-full p-2 placeholder:text-zinc-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-zinc-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Razão Social</th>
                <th className="px-6 py-4 font-medium">Nome Fantasia</th>
                <th className="px-6 py-4 font-medium">CNPJ</th>
                <th className="px-6 py-4 font-medium">Telefone</th>
                <th className="px-6 py-4 font-medium">Distribuidora</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-zinc-500"
                  >
                    <div className="flex justify-center items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Carregando fornecedores...
                    </div>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-zinc-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Truck className="w-8 h-8 opacity-50" />
                      <p>Nenhum fornecedor encontrado.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/suppliers/${supplier.id}`}
                        className="font-medium text-zinc-200 hover:text-accent-red transition-colors"
                      >
                        {supplier.corporate_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {supplier.trade_name || "—"}
                    </td>
                    <td className="px-6 py-4 text-zinc-400 font-mono text-xs">
                      {formatCNPJ(supplier.cnpj)}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {supplier.phone || "—"}
                    </td>
                    <td className="px-6 py-4">
                      {supplier.is_film_distributor ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-amber-950 border-amber-900 text-amber-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-zinc-800 border-zinc-700 text-zinc-500">
                          <XCircle className="w-3 h-3" />
                          Não
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                          supplier.active
                            ? "bg-green-500/10 border-green-500/20 text-green-500"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {supplier.active ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {supplier.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/suppliers/${supplier.id}`}
                          className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() =>
                            handleDelete(
                              supplier.id,
                              supplier.trade_name || supplier.corporate_name,
                            )
                          }
                          className="p-2 hover:bg-red-950/50 rounded-md text-zinc-400 hover:text-red-400 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
