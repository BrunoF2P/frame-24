"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuppliersService } from "@/services/suppliers-service";
import { ArrowLeft, Loader2, Save, Truck } from "lucide-react";
import Link from "next/link";

interface SupplierType {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface SupplierFormData {
  corporate_name: string;
  trade_name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  contact_name: string;
  contact_phone: string;
  delivery_days: number;
  is_film_distributor: boolean;
  supplier_type_id: string;
  active: boolean;
}

const initialFormData: SupplierFormData = {
  corporate_name: "",
  trade_name: "",
  cnpj: "",
  phone: "",
  email: "",
  address: "",
  contact_name: "",
  contact_phone: "",
  delivery_days: 0,
  is_film_distributor: false,
  supplier_type_id: "",
  active: true,
};

export default function NewSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState<SupplierType[]>([]);
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData);

  useEffect(() => {
    SuppliersService.getTypes()
      .then((data) => {
        setTypes(Array.isArray(data) ? (data as SupplierType[]) : []);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        ...formData,
        delivery_days: Number(formData.delivery_days),
        supplier_type_id: formData.supplier_type_id || undefined,
      };
      await SuppliersService.create(payload);
      router.push("/suppliers");
    } catch (error: unknown) {
      let msg = "Erro ao criar fornecedor.";
      if (error && typeof error === "object" && "response" in error) {
        const resp = (error as { response?: { data?: { message?: unknown } } })
          .response;
        if (resp?.data?.message) {
          const m = resp.data.message;
          msg = Array.isArray(m) ? m.join(" | ") : String(m);
        }
      }
      alert(msg);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-md text-white text-sm focus:border-accent-red outline-none transition-colors";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/suppliers"
          className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="w-6 h-6 text-accent-red" />
            Novo Fornecedor
          </h1>
          <p className="text-sm text-zinc-400">
            Cadastre um novo fornecedor ou distribuidora
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 bg-zinc-900 p-6 rounded-lg border border-zinc-800"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1.5 text-zinc-400 font-medium">
              Razão Social *
            </label>
            <input
              className={inputClass}
              value={formData.corporate_name}
              onChange={(e) =>
                setFormData({ ...formData, corporate_name: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-zinc-400 font-medium">
              Nome Fantasia
            </label>
            <input
              className={inputClass}
              value={formData.trade_name}
              onChange={(e) =>
                setFormData({ ...formData, trade_name: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1.5 text-zinc-400 font-medium">
              CNPJ *
            </label>
            <input
              className={inputClass}
              value={formData.cnpj}
              onChange={(e) =>
                setFormData({ ...formData, cnpj: e.target.value })
              }
              placeholder="00.000.000/0000-00"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-zinc-400 font-medium">
              Telefone
            </label>
            <input
              className={inputClass}
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1.5 text-zinc-400 font-medium">
              E-mail
            </label>
            <input
              type="email"
              className={inputClass}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-zinc-400 font-medium">
              Endereço
            </label>
            <input
              className={inputClass}
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1.5 text-zinc-400 font-medium">
              Nome do Contato
            </label>
            <input
              className={inputClass}
              value={formData.contact_name}
              onChange={(e) =>
                setFormData({ ...formData, contact_name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-zinc-400 font-medium">
              Telefone do Contato
            </label>
            <input
              className={inputClass}
              value={formData.contact_phone}
              onChange={(e) =>
                setFormData({ ...formData, contact_phone: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1.5 text-zinc-400 font-medium">
              Dias para Entrega
            </label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={formData.delivery_days}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  delivery_days: Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-zinc-400 font-medium">
              Tipo de Fornecedor
            </label>
            <select
              className={inputClass}
              value={formData.supplier_type_id}
              onChange={(e) =>
                setFormData({ ...formData, supplier_type_id: e.target.value })
              }
            >
              <option value="">Selecione...</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 pt-7">
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  is_film_distributor: !formData.is_film_distributor,
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.is_film_distributor ? "bg-accent-red" : "bg-zinc-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.is_film_distributor
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
            <label className="text-sm text-zinc-400 font-medium">
              Distribuidora de Filmes
            </label>
          </div>
          <div className="flex items-center gap-3 pt-7">
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, active: !formData.active })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.active ? "bg-green-600" : "bg-zinc-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.active ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <label className="text-sm text-zinc-400 font-medium">Ativo</label>
          </div>
        </div>

        <button
          disabled={loading}
          className="w-full bg-accent-red py-2.5 rounded-md text-white font-bold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Criar Fornecedor
            </>
          )}
        </button>
      </form>
    </div>
  );
}
