"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PosService } from "@/services/pos-service";
import { OperationsService } from "@/services/operations-service";
import { ArrowLeft, Loader2, Save, Calculator } from "lucide-react";
import Link from "next/link";

interface CinemaComplex {
  id: string;
  name: string;
  code: string;
}

export default function NewPosSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [complexes, setComplexes] = useState<CinemaComplex[]>([]);
  const [formData, setFormData] = useState({
    cinema_complex_id: "",
    opening_amount: 200,
  });

  useEffect(() => {
    OperationsService.getComplexes()
      .then((data) => {
        setComplexes(Array.isArray(data) ? (data as CinemaComplex[]) : []);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await PosService.openPosSession({
        cinema_complex_id: formData.cinema_complex_id,
        opening_amount: Number(formData.opening_amount),
      });
      router.push("/pos");
    } catch (error: unknown) {
      let msg = "Erro ao abrir caixa.";
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
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-md text-white text-sm focus:border-accent-red outline-none transition-colors";

  return (
    <div className="max-w-lg mx-auto space-y-6">
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
            Abrir Caixa
          </h1>
          <p className="text-sm text-zinc-400">
            Inicie uma nova sessão de frente de caixa
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 bg-zinc-900 p-6 rounded-lg border border-zinc-800"
      >
        <div>
          <label className="block text-sm mb-1.5 text-zinc-400 font-medium">
            Complexo de Cinema *
          </label>
          <select
            className={inputClass}
            value={formData.cinema_complex_id}
            onChange={(e) =>
              setFormData({ ...formData, cinema_complex_id: e.target.value })
            }
            required
          >
            <option value="">Selecione o complexo...</option>
            {complexes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
          {complexes.length === 0 && (
            <p className="text-xs text-yellow-500 mt-1">
              Nenhum complexo encontrado. Verifique o cadastro de complexos.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm mb-1.5 text-zinc-400 font-medium">
            Fundo de Troco (R$)
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            className={inputClass}
            value={formData.opening_amount}
            onChange={(e) =>
              setFormData({
                ...formData,
                opening_amount: Number(e.target.value),
              })
            }
          />
          <p className="text-xs text-zinc-500 mt-1">
            Valor inicial em espécie para troco. Padrão: R$ 200,00
          </p>
        </div>

        <button
          disabled={loading || !formData.cinema_complex_id}
          className="w-full bg-accent-red py-2.5 rounded-md text-white font-bold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Abrindo...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Abrir Caixa
            </>
          )}
        </button>
      </form>
    </div>
  );
}
