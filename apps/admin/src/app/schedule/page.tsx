"use client";

import { useEffect, useState } from "react";
import { ScheduleService } from "@/services/schedule-service";
import { Plus, Calendar, MapPin, Trash2 } from "lucide-react";
import Link from "next/link";

interface ShowtimeMovie {
  brazil_title?: string;
  original_title?: string;
}

interface ShowtimeRoom {
  name?: string;
}

interface ShowtimeStatus {
  name?: string;
}

interface ShowtimeItem {
  id: string;
  start_time: string;
  movie?: ShowtimeMovie;
  rooms?: ShowtimeRoom;
  base_ticket_price?: number;
  session_status?: ShowtimeStatus;
}

export default function SchedulePage() {
  const [showtimes, setShowtimes] = useState<ShowtimeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await ScheduleService.getShowtimes();
      setShowtimes(Array.isArray(data) ? (data as ShowtimeItem[]) : []);
    } catch (error) {
      console.error("Erro ao buscar sessões:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta sessão?")) return;
    try {
      await ScheduleService.deleteShowtime(id);
      setShowtimes((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Erro ao excluir sessão");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Programação</h1>
          <p className="text-sm text-zinc-400">
            Gerencie as sessões de exibição.
          </p>
        </div>
        <Link
          href="/schedule/new"
          className="flex items-center gap-2 bg-accent-red hover:bg-accent-red-hover text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Sessão
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-zinc-900/50 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Data/Hora</th>
              <th className="px-6 py-4 font-medium">Filme</th>
              <th className="px-6 py-4 font-medium">Sala</th>
              <th className="px-6 py-4 font-medium">Preço</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  Carregando...
                </td>
              </tr>
            ) : showtimes.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-zinc-500">
                  Nenhuma sessão agendada.
                </td>
              </tr>
            ) : (
              showtimes.map((session) => (
                <tr key={session.id} className="hover:bg-zinc-800/50">
                  <td className="px-6 py-4 text-zinc-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      {new Date(session.start_time).toLocaleString("pt-BR")}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {session.movie?.brazil_title ||
                      session.movie?.original_title ||
                      "Filme N/D"}
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {session.rooms?.name || "Sala N/D"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    R$ {session.base_ticket_price?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded-full text-xs border border-green-900">
                      {session.session_status?.name || "Ativa"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="text-zinc-400 hover:text-red-500 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
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
