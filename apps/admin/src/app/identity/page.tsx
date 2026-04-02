"use client";

import { useEffect, useState } from "react";
import { UsersService } from "@/services/users-service";
import { Plus, Trash2, Edit2, User } from "lucide-react";
import Link from "next/link";

interface CompanyUserRole {
  role_name?: string;
}

interface UserRow {
  employee_id: string;
  full_name?: string;
  email?: string;
  company_user?: CompanyUserRole;
}

export default function UsersPage() {
  const [data, setData] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    UsersService.getAll()
      .then((data) => {
        setData(data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este usuário?")) return;
    try {
      await UsersService.delete(id);
      setData((prev) => prev.filter((i) => i.employee_id !== id));
    } catch {
      alert("Erro ao deletar usuário.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <Link
          href="/identity/users/new"
          className="bg-accent-red px-4 py-2 rounded text-white flex gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Usuário
        </Link>
      </div>

      <div className="bg-zinc-900/50 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Perfil</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-zinc-500">
                  Carregando...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-zinc-500">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.employee_id} className="hover:bg-zinc-800/50">
                  <td className="px-6 py-4 font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-500" />{" "}
                    {item.full_name || "N/D"}
                  </td>
                  <td className="px-6 py-4 text-zinc-400">{item.email}</td>
                  <td className="px-6 py-4 text-zinc-400">
                    {item.company_user?.role_name || "N/D"}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <Link
                      href={`/identity/users/${item.employee_id}`}
                      className="p-1"
                    >
                      <Edit2 className="w-4 h-4 text-zinc-500 hover:text-white" />
                    </Link>
                    <button
                      onClick={() => handleDelete(item.employee_id)}
                      className="p-1"
                    >
                      <Trash2 className="w-4 h-4 text-zinc-500 hover:text-red-500" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
