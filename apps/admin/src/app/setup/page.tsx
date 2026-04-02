"use client";

import { useState, useEffect } from "react";
import { OperationsService } from "@/services/operations-service";
import { Loader2, Plus, Building, MapPin } from "lucide-react";

interface ComplexItem {
  id: string;
  name: string;
  address: string;
}

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [complexes, setComplexes] = useState<ComplexItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await OperationsService.getComplexes();
      setComplexes(Array.isArray(data) ? (data as ComplexItem[]) : []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateComplex = async () => {
    const name = prompt("Nome do Cinema (Ex: Cineplex Shopping):");
    if (!name) return;

    setLoading(true);
    try {
      await OperationsService.createComplex({
        name,
        code: `CX-${Math.floor(Math.random() * 1000)}`, // Gera código aleatório
        address: "Endereço Padrão",
        ibge_municipality_code: "3550308", // SP Padrão
        active: true,
      });
      await loadData();
      alert("Cinema criado!");
    } catch (error) {
      alert("Erro ao criar cinema.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (complexId: string) => {
    const name = prompt("Nome da Sala (Ex: Sala 1):");
    if (!name) return;

    setLoading(true);
    try {
      await OperationsService.createRoom(complexId, {
        room_number: `${Math.floor(Math.random() * 100)}`,
        name,
        capacity: 50,
      });
      alert("Sala criada! Agora ela aparecerá na Programação.");
    } catch (error) {
      alert("Erro ao criar sala. Verifique o console.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">
          Configuração Rápida
        </h1>
        <button
          onClick={handleCreateComplex}
          disabled={loading}
          className="flex items-center gap-2 bg-accent-red px-4 py-2 rounded text-white hover:bg-red-600"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Plus />} Criar
          Cinema
        </button>
      </div>

      <div className="grid gap-4">
        {complexes.map((c) => (
          <div
            key={c.id}
            className="p-4 bg-zinc-900 border border-zinc-800 rounded flex justify-between items-center"
          >
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-zinc-400" /> {c.name}
              </h3>
              <p className="text-sm text-zinc-500 flex items-center gap-2 mt-1">
                <MapPin className="w-3 h-3" /> {c.address}
              </p>
            </div>
            <button
              onClick={() => handleCreateRoom(c.id)}
              className="text-sm bg-zinc-800 text-zinc-300 px-3 py-1 rounded hover:bg-zinc-700"
            >
              + Adicionar Sala
            </button>
          </div>
        ))}

        {complexes.length === 0 && (
          <div className="text-center py-10 text-zinc-500">
            Nenhum cinema encontrado para sua empresa. Crie um acima.
          </div>
        )}
      </div>
    </div>
  );
}
