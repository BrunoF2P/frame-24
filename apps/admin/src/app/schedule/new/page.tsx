"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CatalogService } from "@/services/catalog-service";
import { ScheduleService } from "@/services/schedule-service";
import { OperationsService } from "@/services/operations-service";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

interface MovieOption {
  id: string;
  brazil_title?: string;
  original_title?: string;
}

interface RoomOption {
  id: string;
  name?: string;
}

interface BaseOption {
  id: string;
  name?: string;
}

interface ShowtimeFormData {
  movie_id: string;
  room_id: string;
  start_time: string;
  base_ticket_price: number;
  session_language: string;
  projection_type: string;
  audio_type: string;
  status: string;
}

export default function NewShowtimePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [movies, setMovies] = useState<MovieOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [projTypes, setProjTypes] = useState<BaseOption[]>([]);
  const [audioTypes, setAudioTypes] = useState<BaseOption[]>([]);
  const [languages, setLanguages] = useState<BaseOption[]>([]);
  const [statuses, setStatuses] = useState<BaseOption[]>([]);

  const [formData, setFormData] = useState<ShowtimeFormData>({
    movie_id: "",
    room_id: "",
    start_time: "",
    base_ticket_price: 25.0,
    session_language: "",
    projection_type: "",
    audio_type: "",
    status: "", // <--- Agora guarda o ID do status
  });

  useEffect(() => {
    async function loadDependencies() {
      try {
        // Busca TUDO, inclusive os Status
        const [
          moviesData,
          roomsData,
          projData,
          audioData,
          langData,
          statusData,
        ] = await Promise.all([
          CatalogService.getMovies(),
          ScheduleService.getRooms(),
          OperationsService.getProjectionTypes(),
          OperationsService.getAudioTypes(),
          OperationsService.getSessionLanguages(),
          OperationsService.getSessionStatuses(), // <--- Busca status
        ]);

        const moviesList = Array.isArray(moviesData)
          ? (moviesData as MovieOption[])
          : [];
        const roomsList = Array.isArray(roomsData)
          ? (roomsData as unknown as RoomOption[])
          : [];
        const projectionList = Array.isArray(projData)
          ? (projData as BaseOption[])
          : [];
        const audioList = Array.isArray(audioData)
          ? (audioData as BaseOption[])
          : [];
        const languageList = Array.isArray(langData)
          ? (langData as BaseOption[])
          : [];
        const statusList = Array.isArray(statusData)
          ? (statusData as BaseOption[])
          : [];

        setMovies(moviesList);
        setRooms(roomsList);
        setProjTypes(projectionList);
        setAudioTypes(audioList);
        setLanguages(languageList);
        setStatuses(statusList);

        // Tenta achar o status "Aberta para Vendas" automaticamente
        const openStatus = statusList.find(
          (status) => status.name === "Aberta para Vendas",
        );

        setFormData((prev) => ({
          ...prev,
          projection_type: projectionList[0]?.id || "",
          audio_type: audioList[0]?.id || "",
          session_language: languageList[0]?.id || "",
          status: openStatus?.id || statusList[0]?.id || "",
        }));
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setInitialLoading(false);
      }
    }
    loadDependencies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await ScheduleService.createShowtime({
        ...formData,
        base_ticket_price: Number(formData.base_ticket_price),
        // Agora o status vai como ID, o que o backend espera
        status: formData.status,
        projection_type: formData.projection_type,
        audio_type: formData.audio_type,
        session_language: formData.session_language,
      });

      alert("Sessão criada com sucesso!");
      router.push("/schedule");
    } catch (error) {
      console.error(error);
      alert("Erro ao criar sessão.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading)
    return <div className="p-8 text-zinc-400">Carregando formulário...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/schedule"
          className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nova Sessão</h1>
          <p className="text-sm text-zinc-400">
            Agende um horário para exibição.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-zinc-900/50 p-6 rounded-lg border border-border"
      >
        {/* FILME e SALA (Mantidos) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Filme *</label>
            <select
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-200 outline-none"
              value={formData.movie_id}
              onChange={(e) =>
                setFormData({ ...formData, movie_id: e.target.value })
              }
            >
              <option value="">Selecione...</option>
              {movies.map((movie) => (
                <option key={movie.id} value={movie.id}>
                  {movie.brazil_title || movie.original_title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Sala *</label>
            <select
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-200 outline-none"
              value={formData.room_id}
              onChange={(e) =>
                setFormData({ ...formData, room_id: e.target.value })
              }
            >
              <option value="">Selecione...</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* DATA E PREÇO (Mantidos) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Data e Hora *
            </label>
            <input
              type="datetime-local"
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-200 outline-none"
              value={formData.start_time}
              onChange={(e) =>
                setFormData({ ...formData, start_time: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Preço (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-200 outline-none"
              value={formData.base_ticket_price}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  base_ticket_price: Number(e.target.value),
                })
              }
            />
          </div>
        </div>

        {/* SELECTS TÉCNICOS + STATUS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Idioma</label>
            <select
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-200 outline-none"
              value={formData.session_language}
              onChange={(e) =>
                setFormData({ ...formData, session_language: e.target.value })
              }
            >
              <option value="">Selecione...</option>
              {languages.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Projeção
            </label>
            <select
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-200 outline-none"
              value={formData.projection_type}
              onChange={(e) =>
                setFormData({ ...formData, projection_type: e.target.value })
              }
            >
              <option value="">Selecione...</option>
              {projTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Áudio</label>
            <select
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-200 outline-none"
              value={formData.audio_type}
              onChange={(e) =>
                setFormData({ ...formData, audio_type: e.target.value })
              }
            >
              <option value="">Selecione...</option>
              {audioTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* NOVO CAMPO: Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Status</label>
            <select
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-200 outline-none"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <option value="">Selecione...</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-accent-red hover:bg-accent-red-hover text-white px-6 py-3 rounded-md font-medium"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Salvar Sessão
          </button>
        </div>
      </form>
    </div>
  );
}
