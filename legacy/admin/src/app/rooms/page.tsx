"use client";

import { useEffect, useState } from "react";
import { OperationsService } from "@/services/operations-service";
import { CinemaComplex, Room } from "@/types/operations";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  DoorOpen,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

export default function RoomsPage() {
  const [complexes, setComplexes] = useState<CinemaComplex[]>([]);
  const [roomsByComplex, setRoomsByComplex] = useState<Record<string, Room[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedComplex, setExpandedComplex] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const complexData = await OperationsService.getComplexes();
      const complexesList = Array.isArray(complexData)
        ? (complexData as CinemaComplex[])
        : [];
      setComplexes(complexesList);

      const roomsMap: Record<string, Room[]> = {};
      for (const complex of complexesList) {
        try {
          const rooms = await OperationsService.getRooms(complex.id);
          roomsMap[complex.id] = Array.isArray(rooms) ? (rooms as Room[]) : [];
        } catch {
          roomsMap[complex.id] = [];
        }
      }
      setRoomsByComplex(roomsMap);

      if (complexesList.length > 0 && !expandedComplex) {
        setExpandedComplex(complexesList[0]!.id);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (
    complexId: string,
    roomId: string,
    roomName: string,
  ) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir a sala "${roomName}"? Todos os assentos serão removidos.`,
      )
    )
      return;

    try {
      await OperationsService.deleteRoom(complexId, roomId);
      setRoomsByComplex((prev) => ({
        ...prev,
        [complexId]: (prev[complexId] || []).filter((r) => r.id !== roomId),
      }));
    } catch (error) {
      console.error("Erro ao excluir sala:", error);
      alert("Não foi possível excluir a sala. Verifique se não há sessões vinculadas.");
    }
  };

  const handleToggleStatus = async (
    complexId: string,
    room: Room,
  ) => {
    try {
      setTogglingId(room.id);
      const newStatus = !room.active;

      setRoomsByComplex((prev) => ({
        ...prev,
        [complexId]: (prev[complexId] || []).map((r) =>
          r.id === room.id ? { ...r, active: newStatus } : r,
        ),
      }));

      await OperationsService.updateRoom(complexId, room.id, {
        active: newStatus,
      });
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      setRoomsByComplex((prev) => ({
        ...prev,
        [complexId]: (prev[complexId] || []).map((r) =>
          r.id === room.id ? { ...r, active: !room.active } : r,
        ),
      }));
      alert("Erro ao atualizar status da sala.");
    } finally {
      setTogglingId(null);
    }
  };

  const totalRooms = Object.values(roomsByComplex).reduce(
    (sum, rooms) => sum + rooms.length,
    0,
  );

  const totalSeats = Object.values(roomsByComplex)
    .flat()
    .reduce((sum, room) => sum + (room.capacity || 0), 0);

  const filteredComplexes = complexes.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (roomsByComplex[c.id] || []).some((r) =>
        (r.name || "").toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Salas & Complexos
          </h1>
          <p className="text-sm text-zinc-400">
            {totalRooms} salas em {complexes.length} complexos &bull;{" "}
            {totalSeats} assentos totais
          </p>
        </div>
        <Link
          href="/rooms/new"
          className="flex items-center gap-2 bg-accent-red hover:bg-accent-red-hover text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Sala
        </Link>
      </div>

      <div className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded-lg border border-border">
        <Search className="w-5 h-5 text-zinc-500 ml-2" />
        <input
          type="text"
          placeholder="Buscar por complexo ou sala..."
          className="bg-transparent border-none focus:outline-none text-zinc-200 w-full p-2 placeholder:text-zinc-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center gap-2 py-12 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Carregando salas...
        </div>
      ) : filteredComplexes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-zinc-500">
          <DoorOpen className="w-8 h-8 opacity-50" />
          <p>Nenhum complexo ou sala encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplexes.map((complex) => {
            const rooms = (roomsByComplex[complex.id] || []).filter(
              (r) =>
                !searchTerm ||
                complex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.name || "").toLowerCase().includes(searchTerm.toLowerCase()),
            );
            const isExpanded = expandedComplex === complex.id;

            return (
              <div
                key={complex.id}
                className="rounded-lg border border-border bg-zinc-900/50 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedComplex(isExpanded ? null : complex.id)
                  }
                  className="w-full flex items-center gap-3 px-6 py-4 hover:bg-zinc-800/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  )}
                  <Building2 className="w-5 h-5 text-accent-red" />
                  <div className="flex-1 text-left">
                    <span className="font-medium text-zinc-200">
                      {complex.name}
                    </span>
                    {complex.city && (
                      <span className="ml-2 text-xs text-zinc-500">
                        {complex.city}
                        {complex.state ? ` - ${complex.state}` : ""}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {rooms.length} {rooms.length === 1 ? "sala" : "salas"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    {rooms.length === 0 ? (
                      <div className="px-6 py-8 text-center text-zinc-500 text-sm">
                        Nenhuma sala cadastrada neste complexo.
                      </div>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs">
                          <tr>
                            <th className="px-6 py-3 font-medium">Sala</th>
                            <th className="px-6 py-3 font-medium">
                              Capacidade
                            </th>
                            <th className="px-6 py-3 font-medium">Projeção</th>
                            <th className="px-6 py-3 font-medium">Áudio</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                            <th className="px-6 py-3 font-medium text-right">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {rooms.map((room) => (
                            <tr
                              key={room.id}
                              className="hover:bg-zinc-800/50 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="font-medium text-zinc-200">
                                    {room.name || `Sala ${room.room_number}`}
                                  </span>
                                  <span className="text-xs text-zinc-500">
                                    Nº {room.room_number}
                                    {room.room_design &&
                                      ` • ${room.room_design}`}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-zinc-400">
                                {room.capacity} lugares
                              </td>
                              <td className="px-6 py-4 text-zinc-400">
                                {room.projection_types?.name || "—"}
                              </td>
                              <td className="px-6 py-4 text-zinc-400">
                                {room.audio_types?.name || "—"}
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() =>
                                    handleToggleStatus(complex.id, room)
                                  }
                                  disabled={togglingId === room.id}
                                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                    room.active
                                      ? "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
                                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                                  }`}
                                >
                                  {togglingId === room.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : room.active ? (
                                    <Eye className="w-3 h-3" />
                                  ) : (
                                    <EyeOff className="w-3 h-3" />
                                  )}
                                  {room.active ? "Ativa" : "Inativa"}
                                </button>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <Link
                                    href={`/rooms/${room.id}?complexId=${complex.id}`}
                                    className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors"
                                    title="Editar / Layout"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Link>
                                  <button
                                    onClick={() =>
                                      handleDelete(
                                        complex.id,
                                        room.id,
                                        room.name || `Sala ${room.room_number}`,
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
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
