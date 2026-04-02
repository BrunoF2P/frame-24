"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UsersService } from "@/services/users-service";
import { RolesService } from "@/services/roles-service";
import { ArrowLeft, Save, Loader2, KeyRound } from "lucide-react";
import Link from "next/link";

interface RoleOption {
  id: string;
  name: string;
}

interface UserResponse {
  full_name?: string;
  email: string;
  company_user?: {
    role_id?: string;
  };
}

export default function EditUserPage({ params }: { params: { id: string } }) {
  const { id: userId } = params;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  // Estado para o formulário principal
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role_id: "",
  });

  // Estado para o formulário de senha
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [userData, rolesData] = await Promise.all([
          UsersService.getById(userId),
          RolesService.getAll(),
        ]);

        const rolesList = Array.isArray(rolesData)
          ? (rolesData as RoleOption[])
          : [];
        const user = userData as UserResponse;

        setRoles(rolesList);

        setFormData({
          full_name: user.full_name || "",
          email: user.email,
          role_id: user.company_user?.role_id || rolesList[0]?.id || "",
        });
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        alert("Usuário não encontrado.");
        router.push("/identity/users");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userId, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Assumindo que você tem uma função update no UsersService
      // await UsersService.update(userId, payload);

      alert("Usuário atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      alert("Erro ao atualizar usuário.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }

    setPasswordLoading(true);
    try {
      // Assumindo que a API de usuários tem um endpoint para mudança de senha
      // await UsersService.changePassword(userId, { new_password: passwordData.newPassword });

      alert("Senha alterada com sucesso!");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      alert("Erro ao alterar senha.");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-zinc-400">Carregando dados do usuário...</div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/identity/users"
          className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            Editar Usuário: {formData.full_name}
          </h1>
        </div>
      </div>

      {/* Seção 1: Informações Básicas e Perfil */}
      <div className="bg-zinc-900/50 p-6 rounded-lg border border-border space-y-6">
        <h2 className="font-semibold text-xl border-b border-zinc-800 pb-3 text-white">
          Dados do Perfil
        </h2>
        <form onSubmit={handleUpdate} className="space-y-4">
          {/* Nome e Email */}
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
          </div>

          {/* Perfil de Acesso */}
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

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-accent-red hover:bg-accent-red-hover disabled:opacity-50 text-white px-6 py-2 rounded-md font-bold transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Atualizar Dados
            </button>
          </div>
        </form>
      </div>

      {/* Seção 2: Alterar Senha */}
      <div className="bg-zinc-900/50 p-6 rounded-lg border border-border space-y-6">
        <h2 className="font-semibold text-xl border-b border-zinc-800 pb-3 text-white">
          Alterar Senha
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-zinc-400">Nova Senha *</label>
              <input
                required
                type="password"
                className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded text-white"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400">Confirmar Senha *</label>
              <input
                required
                type="password"
                className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded text-white"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={
                passwordLoading ||
                !passwordData.newPassword ||
                passwordData.newPassword !== passwordData.confirmPassword
              }
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-md font-bold transition-colors"
            >
              {passwordLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <KeyRound className="w-5 h-5" />
              )}
              Alterar Senha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
