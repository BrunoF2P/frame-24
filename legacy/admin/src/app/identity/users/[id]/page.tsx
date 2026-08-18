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
  employee_id: string;
  full_name: string;
  email: string;
  cpf: string | null;
  mobile: string | null;
  company_user: {
    id: string;
    employee_id: string;
    role_id: string;
    role_name: string;
    department: string | null;
    job_level: string | null;
    active: boolean;
    start_date: string;
    end_date: string | null;
    last_access: string | null;
  };
}

export default function EditUserPage({ params }: { params: { id: string } }) {
  const { id: userId } = params;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    cpf: "",
    mobile: "",
    role_id: "",
    department: "",
    job_level: "",
    active: true,
  });

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
          email: user.email || "",
          cpf: user.cpf || "",
          mobile: user.mobile || "",
          role_id: user.company_user?.role_id || rolesList[0]?.id || "",
          department: user.company_user?.department || "",
          job_level: user.company_user?.job_level || "",
          active: user.company_user?.active ?? true,
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
    setSaving(true);

    try {
      await UsersService.update(userId, {
        full_name: formData.full_name,
        email: formData.email,
        cpf: formData.cpf || undefined,
        mobile: formData.mobile || undefined,
        role_id: formData.role_id,
        department: formData.department || undefined,
        job_level: formData.job_level || undefined,
        active: formData.active,
      });

      alert("Usuário atualizado com sucesso!");
      router.push("/identity/users");
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      alert("Erro ao atualizar usuário.");
    } finally {
      setSaving(false);
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

      <form onSubmit={handleUpdate} className="space-y-8">
        <div className="bg-zinc-900/50 p-6 rounded-lg border border-border space-y-6">
          <h2 className="font-semibold text-xl border-b border-zinc-800 pb-3 text-white">
            Dados Pessoais
          </h2>

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
              <label className="text-sm text-zinc-400">Celular</label>
              <input
                className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded text-white"
                value={formData.mobile}
                onChange={(e) =>
                  setFormData({ ...formData, mobile: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 p-6 rounded-lg border border-border space-y-6">
          <h2 className="font-semibold text-xl border-b border-zinc-800 pb-3 text-white">
            Dados da Empresa
          </h2>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="text-sm text-zinc-400">Departamento</label>
              <input
                className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded text-white"
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-zinc-400">Cargo / Nível</label>
              <input
                className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded text-white"
                value={formData.job_level}
                onChange={(e) =>
                  setFormData({ ...formData, job_level: e.target.value })
                }
              />
            </div>
            <div className="flex items-end gap-3 pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                  className="w-5 h-5 accent-accent-red"
                />
                <span className="text-sm text-zinc-400">Ativo</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 p-6 rounded-lg border border-border space-y-6">
          <h2 className="font-semibold text-xl border-b border-zinc-800 pb-3 text-white">
            Alterar Senha
          </h2>
          <p className="text-sm text-zinc-500">
            Funcionalidade de alteração de senha ainda não está disponível.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              disabled
              className="flex items-center gap-2 bg-zinc-700 text-zinc-400 px-6 py-2 rounded-md font-bold cursor-not-allowed"
            >
              <KeyRound className="w-5 h-5" />
              Alterar Senha
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-accent-red hover:bg-accent-red-hover disabled:opacity-50 text-white px-6 py-3 rounded-md font-bold transition-colors"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Atualizar Usuário
          </button>
        </div>
      </form>
    </div>
  );
}
