"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UsersService } from "@/services/users-service";
import { RolesService } from "@/services/roles-service"; // Importa RolesService para buscar perfis
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

interface RoleOption {
  id: string;
  name: string;
}

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role_id: "",
    cpf: "",
  });

  useEffect(() => {
    // Carrega todos os perfis para o select
    RolesService.getAll()
      .then((data) => {
        const rolesList = Array.isArray(data) ? (data as RoleOption[]) : [];
        setRoles(rolesList);
        if (rolesList.length > 0) {
          const firstRole = rolesList[0];
          if (firstRole) {
            setFormData((prev) => ({ ...prev, role_id: firstRole.id }));
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await UsersService.create({
        ...formData,
        country: "BR",
        active: true,
      });
      alert("Usuário criado com sucesso!");
      router.push("/identity/users");
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      alert("Erro ao criar usuário. Verifique se o email/CPF já existe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/identity/users"
          className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Novo Usuário</h1>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-zinc-900/50 p-6 rounded-lg border border-border"
      >
        {/* Nome e CPF */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-zinc-400">Nome Completo *</label>
            <input
              required
              className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded text-white"
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400">CPF</label>
            <input
              className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded text-white"
              value={formData.cpf}
              onChange={(e) =>
                setFormData({ ...formData, cpf: e.target.value })
              }
            />
          </div>
        </div>

        {/* Email e Senha */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-zinc-400">Email *</label>
            <input
              required
              type="email"
              className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded text-white"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Senha *</label>
            <input
              required
              type="password"
              className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded text-white"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>
        </div>

        {/* Perfil de Acesso (Role) */}
        <div>
          <label className="text-sm text-zinc-400">Perfil de Acesso *</label>
          <select
            required
            className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded text-white"
            value={formData.role_id}
            onChange={(e) =>
              setFormData({ ...formData, role_id: e.target.value })
            }
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-accent-red hover:bg-accent-red-hover disabled:opacity-50 text-white px-6 py-3 rounded-md font-bold transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Salvar Usuário
          </button>
        </div>
      </form>
    </div>
  );
}
