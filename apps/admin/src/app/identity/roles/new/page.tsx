"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RolesService } from "@/services/roles-service";
import { ArrowLeft, Save, Loader2, Lock, Unlock } from "lucide-react";
import Link from "next/link";

interface Permission {
  id: string;
  resource: string;
  action: string;
  name: string;
  module: string;
}

export default function NewRolePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    // Mapa: { permissionId: boolean }
    permissionMap: {} as Record<string, boolean>,
  });

  useEffect(() => {
    // Carrega todas as permissões para a tabela de seleção
    RolesService.getPermissions()
      .then((data) => {
        setPermissions(data as Permission[]);
      })
      .catch(console.error);
  }, []);

  const handlePermissionToggle = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      permissionMap: {
        ...prev.permissionMap,
        [id]: !prev.permissionMap[id],
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Constrói o payload de permissões para o backend
      const selectedPermissions = Object.entries(formData.permissionMap)
        .filter(([, isSelected]) => isSelected)
        .map(([permissionId]) => ({
          permission_id: permissionId,
          conditions: null, // Deixamos nulo por enquanto
        }));

      const payload = {
        name: formData.name,
        description: formData.description,
        permissions: selectedPermissions.map((permission) => [
          permission.permission_id,
        ]),
      };

      await RolesService.create(payload);

      alert("Perfil de Acesso criado com sucesso!");
      router.push("/identity/roles");
    } catch (error) {
      console.error("Erro ao criar perfil:", error);
      alert("Erro ao criar Perfil de Acesso. Verifique o console.");
    } finally {
      setLoading(false);
    }
  };

  const permissionsByModule = permissions.reduce(
    (acc: Record<string, Permission[]>, p) => {
      const moduleName = p.module || "Geral";
      if (!acc[moduleName]) acc[moduleName] = [];
      acc[moduleName].push(p);
      return acc;
    },
    {},
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/identity/roles"
          className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Novo Perfil de Acesso</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Detalhes Básicos */}
        <div className="bg-zinc-900/50 p-6 rounded-lg border border-border space-y-4">
          <h2 className="font-semibold text-lg text-white">
            Informações Principais
          </h2>
          <div>
            <label className="text-sm text-zinc-400">Nome do Perfil *</label>
            <input
              required
              className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Descrição</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white min-h-[80px]"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
        </div>

        {/* Tabela de Permissões */}
        <div className="bg-zinc-900/50 p-6 rounded-lg border border-border">
          <h2 className="font-semibold text-lg mb-4 text-white">Permissões</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Selecione quais ações este perfil pode realizar.
          </p>

          <div className="space-y-6">
            {Object.entries(permissionsByModule).map(
              ([moduleName, modulePermissions]) => (
                <div
                  key={moduleName}
                  className="border border-zinc-800 rounded-lg overflow-hidden"
                >
                  <div className="bg-zinc-800 p-3 font-bold text-zinc-300 text-sm">
                    Módulo: {moduleName}
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {modulePermissions.map((p) => {
                      const isChecked = formData.permissionMap[p.id];
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-3 transition-colors ${isChecked ? "bg-green-900/20" : "hover:bg-zinc-800/30"}`}
                        >
                          <div className="text-sm">
                            <span className="font-medium text-white">
                              {p.name}
                            </span>
                            <span className="text-zinc-500 ml-2 text-xs">
                              ({p.resource}:{p.action})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePermissionToggle(p.id)}
                            className={`p-2 rounded-full transition-colors ${isChecked ? "bg-green-600 hover:bg-green-700" : "bg-zinc-700 hover:bg-zinc-600"}`}
                          >
                            {isChecked ? (
                              <Unlock className="w-4 h-4 text-white" />
                            ) : (
                              <Lock className="w-4 h-4 text-zinc-300" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </div>

          {permissions.length === 0 && (
            <p className="text-center text-zinc-500 py-4">
              Carregando permissões...
            </p>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading || !formData.name}
            className="flex items-center gap-2 bg-accent-red hover:bg-accent-red-hover disabled:opacity-50 text-white px-6 py-3 rounded-md font-bold transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Salvar Perfil
          </button>
        </div>
      </form>
    </div>
  );
}
