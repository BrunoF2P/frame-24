"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OperationsService } from "@/services/operations-service";
import {
  CinemaComplex,
  ProjectionType,
  AudioType,
  SeatType,
  SeatLayoutRow,
  SeatLayoutItem,
} from "@/types/operations";
import {
  Save,
  Loader2,
  Plus,
  Minus,
  RotateCcw,
  Accessibility,
  Users,
  Armchair,
  Heart,
} from "lucide-react";

const SEAT_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  standard: { bg: "bg-zinc-700", border: "border-zinc-600", text: "text-zinc-300", label: "Padrão" },
  pcd: { bg: "bg-blue-900/50", border: "border-blue-500", text: "text-blue-400", label: "PCD" },
  companion: { bg: "bg-cyan-900/50", border: "border-cyan-500", text: "text-cyan-400", label: "Acompanhante" },
  premium: { bg: "bg-amber-900/50", border: "border-amber-500", text: "text-amber-400", label: "Premium" },
  vip: { bg: "bg-purple-900/50", border: "border-purple-500", text: "text-purple-400", label: "VIP Recliner" },
  couple: { bg: "bg-pink-900/50", border: "border-pink-500", text: "text-pink-400", label: "Casal" },
  empty: { bg: "bg-zinc-900/30", border: "border-zinc-800", text: "text-zinc-600", label: "Vazio" },
};

const ROOM_DESIGNS = [
  { value: "classic_grid", label: "Grade Clássica" },
  { value: "recliner", label: "Recliner" },
  { value: "hybrid", label: "Híbrido" },
  { value: "junior_zone", label: "Zona Júnior" },
];

interface FormData {
  cinema_complex_id: string;
  room_number: string;
  name: string;
  capacity: number;
  projection_type_id: string;
  audio_type_id: string;
  room_design: string;
  seat_layout: SeatLayoutRow[];
}

const DEFAULT_LAYOUT_ROWS = 5;
const DEFAULT_LAYOUT_COLS = 10;

function generateLayout(
  rows: number,
  cols: number,
  seatTypes: SeatType[],
): SeatLayoutRow[] {
  const standardId = seatTypes.find((s) => s.name.toLowerCase().includes("padr"))?.id || null;
  const layout: SeatLayoutRow[] = [];
  for (let r = 0; r < rows; r++) {
    const rowCode = String.fromCharCode(65 + r);
    const seats: SeatLayoutItem[] = [];
    for (let c = 1; c <= cols; c++) {
      seats.push({
        column_number: c,
        seat_type_id: standardId,
        accessible: false,
      });
    }
    layout.push({ row_code: rowCode, seats });
  }
  return layout;
}

function getSeatKind(
  seatTypeId: string | null,
  seatTypes: SeatType[],
): string {
  if (!seatTypeId) return "empty";
  const st = seatTypes.find((s) => s.id === seatTypeId);
  if (!st) return "empty";
  const name = st.name.toLowerCase();
  if (name.includes("pcd") || name.includes("defici") || name.includes("wheelchair"))
    return "pcd";
  if (name.includes("acomp") || name.includes("companion"))
    return "companion";
  if (name.includes("premium")) return "premium";
  if (name.includes("vip") || name.includes("recliner")) return "vip";
  if (name.includes("casal") || name.includes("couple")) return "couple";
  return "standard";
}

function RoomFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const preselectedComplex = searchParams.get("complexId");
  const isEditing = !!editId;

  const [saving, setSaving] = useState(false);
  const [loadingDeps, setLoadingDeps] = useState(true);
  const [loadingRoom, setLoadingRoom] = useState(false);

  const [complexes, setComplexes] = useState<CinemaComplex[]>([]);
  const [projectionTypes, setProjectionTypes] = useState<ProjectionType[]>([]);
  const [audioTypes, setAudioTypes] = useState<AudioType[]>([]);
  const [seatTypes, setSeatTypes] = useState<SeatType[]>([]);

  const [formData, setFormData] = useState<FormData>({
    cinema_complex_id: preselectedComplex || "",
    room_number: "",
    name: "",
    capacity: 0,
    projection_type_id: "",
    audio_type_id: "",
    room_design: "classic_grid",
    seat_layout: [],
  });

  const [selectedSeatKind, setSelectedSeatKind] = useState<string>("pcd");
  const [layoutRows, setLayoutRows] = useState(DEFAULT_LAYOUT_ROWS);
  const [layoutCols, setLayoutCols] = useState(DEFAULT_LAYOUT_COLS);

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    if (isEditing && editId && formData.cinema_complex_id) {
      loadRoom();
    }
  }, [isEditing, editId, formData.cinema_complex_id]);

  const loadDependencies = async () => {
    try {
      setLoadingDeps(true);
      const [cplx, pt, at, st] = await Promise.all([
        OperationsService.getComplexes(),
        OperationsService.getProjectionTypes(),
        OperationsService.getAudioTypes(),
        OperationsService.getSeatTypes(),
      ]);
      setComplexes(Array.isArray(cplx) ? (cplx as CinemaComplex[]) : []);
      setProjectionTypes(Array.isArray(pt) ? (pt as ProjectionType[]) : []);
      setAudioTypes(Array.isArray(at) ? (at as AudioType[]) : []);
      const seatTypesList = Array.isArray(st) ? (st as SeatType[]) : [];
      setSeatTypes(seatTypesList);

      if (!isEditing) {
        setFormData((prev) => ({
          ...prev,
          seat_layout: generateLayout(
            DEFAULT_LAYOUT_ROWS,
            DEFAULT_LAYOUT_COLS,
            seatTypesList,
          ),
        }));
        setLayoutRows(DEFAULT_LAYOUT_ROWS);
        setLayoutCols(DEFAULT_LAYOUT_COLS);
      }
    } catch (error) {
      console.error("Erro ao carregar dependências:", error);
    } finally {
      setLoadingDeps(false);
    }
  };

  const loadRoom = async () => {
    if (!editId || !formData.cinema_complex_id) return;
    try {
      setLoadingRoom(true);
      const data = await OperationsService.getRoomById(
        formData.cinema_complex_id,
        editId,
      );
      const room = data as Record<string, unknown>;
      let layout: SeatLayoutRow[] = [];
      if (room.seat_layout) {
        try {
          const parsed =
            typeof room.seat_layout === "string"
              ? JSON.parse(room.seat_layout)
              : room.seat_layout;
          if (Array.isArray(parsed)) layout = parsed;
        } catch {
          /* ignore */
        }
      }

      setFormData({
        cinema_complex_id: (room.cinema_complex_id as string) || formData.cinema_complex_id,
        room_number: (room.room_number as string) || "",
        name: (room.name as string) || "",
        capacity: (room.capacity as number) || 0,
        projection_type_id:
          (room.projection_types as Record<string, string>)?.id ||
          (room.projection_type as string) ||
          "",
        audio_type_id:
          (room.audio_types as Record<string, string>)?.id ||
          (room.audio_type as string) ||
          "",
        room_design: (room.room_design as string) || "classic_grid",
        seat_layout: layout,
      });

      if (layout.length > 0) {
        setLayoutRows(layout.length);
        setLayoutCols(
          Math.max(...layout.map((r) => r.seats.length)),
        );
      }
    } catch (error) {
      console.error("Erro ao carregar sala:", error);
      alert("Erro ao carregar dados da sala.");
    } finally {
      setLoadingRoom(false);
    }
  };

  const recalcCapacity = useCallback(
    (layout: SeatLayoutRow[]) => {
      const count = layout.reduce(
        (sum, row) => sum + row.seats.length,
        0,
      );
      setFormData((prev) => ({ ...prev, capacity: count, seat_layout: layout }));
    },
    [],
  );

  const regenerateLayout = () => {
    const layout = generateLayout(layoutRows, layoutCols, seatTypes);
    recalcCapacity(layout);
  };

  const addRow = () => {
    const newRowCode = String.fromCharCode(65 + formData.seat_layout.length);
    const standardId = seatTypes.find((s) => s.name.toLowerCase().includes("padr"))?.id || null;
    const seats: SeatLayoutItem[] = [];
    for (let c = 1; c <= layoutCols; c++) {
      seats.push({ column_number: c, seat_type_id: standardId, accessible: false });
    }
    const newLayout = [...formData.seat_layout, { row_code: newRowCode, seats }];
    setLayoutRows(newLayout.length);
    recalcCapacity(newLayout);
  };

  const removeRow = () => {
    if (formData.seat_layout.length <= 1) return;
    const newLayout = formData.seat_layout.slice(0, -1);
    setLayoutRows(newLayout.length);
    recalcCapacity(newLayout);
  };

  const addColumn = () => {
    const newLayout = formData.seat_layout.map((row) => {
      const nextCol = row.seats.length + 1;
      const standardId = seatTypes.find((s) => s.name.toLowerCase().includes("padr"))?.id || null;
      return {
        ...row,
        seats: [
          ...row.seats,
          { column_number: nextCol, seat_type_id: standardId, accessible: false },
        ],
      };
    });
    setLayoutCols((prev) => prev + 1);
    recalcCapacity(newLayout);
  };

  const removeColumn = () => {
    if (layoutCols <= 1) return;
    const newLayout = formData.seat_layout.map((row) => ({
      ...row,
      seats: row.seats.slice(0, -1),
    }));
    setLayoutCols((prev) => prev - 1);
    recalcCapacity(newLayout);
  };

  const toggleSeat = (rowIndex: number, seatIndex: number) => {
    const kind = selectedSeatKind;
    const seatTypeId = getSeatTypeIdForKind(kind);
    const accessible = kind === "pcd" || kind === "empty";

    if (kind === "empty") {
      const newLayout = formData.seat_layout.map((row, ri) => {
        if (ri !== rowIndex) return row;
        const newSeats = row.seats.filter((_, si) => si !== seatIndex);
        return {
          ...row,
          seats: newSeats.map((s, i) => ({ ...s, column_number: i + 1 })),
        };
      });
      recalcCapacity(newLayout);
      return;
    }

    const newLayout = formData.seat_layout.map((row, ri) => {
      if (ri !== rowIndex) return row;
      const newSeats = row.seats.map((seat, si) => {
        if (si !== seatIndex) return seat;
        const currentKind = getSeatKind(seat.seat_type_id, seatTypes);
        if (currentKind === kind) {
          const standardId = seatTypes.find((s) => s.name.toLowerCase().includes("padr"))?.id || null;
          return { ...seat, seat_type_id: standardId, accessible: false };
        }
        return { ...seat, seat_type_id: seatTypeId, accessible };
      });
      return { ...row, seats: newSeats };
    });
    recalcCapacity(newLayout);
  };

  const getSeatTypeIdForKind = (kind: string): string | null => {
    switch (kind) {
      case "pcd":
        return seatTypes.find((s) => s.name.toLowerCase().includes("pcd") || s.name.toLowerCase().includes("defici"))?.id || null;
      case "companion":
        return seatTypes.find((s) => s.name.toLowerCase().includes("acomp") || s.name.toLowerCase().includes("companion"))?.id || null;
      case "premium":
        return seatTypes.find((s) => s.name.toLowerCase().includes("premium"))?.id || null;
      case "vip":
        return seatTypes.find((s) => s.name.toLowerCase().includes("vip") || s.name.toLowerCase().includes("recliner"))?.id || null;
      case "couple":
        return seatTypes.find((s) => s.name.toLowerCase().includes("casal") || s.name.toLowerCase().includes("couple"))?.id || null;
      case "standard":
        return seatTypes.find((s) => s.name.toLowerCase().includes("padr"))?.id || null;
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cinema_complex_id) {
      alert("Selecione um complexo de cinema.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        room_number: formData.room_number,
        name: formData.name || null,
        capacity: formData.capacity,
        projection_type_id: formData.projection_type_id || null,
        audio_type_id: formData.audio_type_id || null,
        room_design: formData.room_design || null,
        seat_layout: formData.seat_layout,
      };

      if (isEditing && editId) {
        await OperationsService.updateRoom(
          formData.cinema_complex_id,
          editId,
          payload,
        );
      } else {
        await OperationsService.createRoom(
          formData.cinema_complex_id,
          payload,
        );
      }

      router.push("/rooms");
      router.refresh();
    } catch (error: unknown) {
      console.error("Erro ao salvar sala:", error);
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      const displayMsg = Array.isArray(msg)
        ? msg.join("\n")
        : msg || "Erro ao salvar sala.";
      alert(displayMsg);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-accent-red";
  const labelClass = "block text-sm font-medium text-zinc-300 mb-1";
  const selectClass =
    "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-accent-red appearance-none";

  if (loadingDeps) {
    return (
      <div className="flex justify-center items-center gap-2 py-12 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        Carregando dados...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isEditing ? "Editar Sala" : "Nova Sala"}
        </h1>
        <p className="text-sm text-zinc-400">
          {isEditing
            ? "Edite as informações e o layout de assentos da sala."
            : "Crie uma nova sala com layout de assentos personalizado."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* --- Informações Básicas --- */}
        <section className="rounded-lg border border-border bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Informações Básicas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Complexo *</label>
              <select
                className={selectClass}
                value={formData.cinema_complex_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    cinema_complex_id: e.target.value,
                  }))
                }
                disabled={isEditing}
              >
                <option value="">Selecione...</option>
                {complexes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Número da Sala *</label>
              <input
                type="text"
                className={inputClass}
                value={formData.room_number}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    room_number: e.target.value,
                  }))
                }
                placeholder="Ex: 01"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Nome da Sala</label>
              <input
                type="text"
                className={inputClass}
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ex: Sala Premier 01"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Tipo de Projeção</label>
              <select
                className={selectClass}
                value={formData.projection_type_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    projection_type_id: e.target.value,
                  }))
                }
              >
                <option value="">Selecione...</option>
                {projectionTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tipo de Áudio</label>
              <select
                className={selectClass}
                value={formData.audio_type_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    audio_type_id: e.target.value,
                  }))
                }
              >
                <option value="">Selecione...</option>
                {audioTypes.map((at) => (
                  <option key={at.id} value={at.id}>
                    {at.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Design da Sala</label>
              <select
                className={selectClass}
                value={formData.room_design}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    room_design: e.target.value,
                  }))
                }
              >
                {ROOM_DESIGNS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* --- Layout de Assentos --- */}
        <section className="rounded-lg border border-border bg-zinc-900/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Layout de Assentos
            </h2>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Users className="w-4 h-4" />
              {formData.capacity} lugares &bull; {formData.seat_layout.length}{" "}
              fileiras
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
            <div className="flex items-center gap-1 mr-4">
              <span className="text-xs text-zinc-500 mr-1">Fileiras:</span>
              <button
                type="button"
                onClick={removeRow}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm text-zinc-300 w-6 text-center">
                {formData.seat_layout.length}
              </span>
              <button
                type="button"
                onClick={addRow}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 mr-4">
              <span className="text-xs text-zinc-500 mr-1">Colunas:</span>
              <button
                type="button"
                onClick={removeColumn}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm text-zinc-300 w-6 text-center">
                {layoutCols}
              </span>
              <button
                type="button"
                onClick={addColumn}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={regenerateLayout}
              className="flex items-center gap-1 px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Redefinir
            </button>
          </div>

          {/* Seat Kind Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500 mr-1">Pincel:</span>
            {Object.entries(SEAT_COLORS).map(([kind, colors]) => {
              if (kind === "empty") return null;
              const Icon =
                kind === "pcd"
                  ? Accessibility
                  : kind === "companion"
                    ? Users
                    : kind === "vip" || kind === "premium"
                      ? Armchair
                      : kind === "couple"
                        ? Heart
                        : null;

              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setSelectedSeatKind(kind)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                    selectedSeatKind === kind
                      ? `${colors.bg} ${colors.border} ${colors.text} ring-1 ring-offset-1 ring-offset-zinc-900 ring-current`
                      : `bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700`
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {colors.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedSeatKind("empty")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                selectedSeatKind === "empty"
                  ? "bg-red-950/50 border-red-800 text-red-400 ring-1 ring-offset-1 ring-offset-zinc-900 ring-current"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              Remover
            </button>
          </div>

          {/* Seat Grid */}
          <div className="overflow-x-auto pb-2">
            <div className="min-w-fit">
              {/* Screen indicator */}
              <div className="flex justify-center mb-4">
                <div className="w-3/4 h-2 bg-gradient-to-r from-transparent via-zinc-500 to-transparent rounded-full" />
              </div>
              <div className="text-center mb-3 text-xs text-zinc-600 uppercase tracking-widest">
                Tela
              </div>

              {formData.seat_layout.map((row, rowIndex) => (
                <div
                  key={row.row_code}
                  className="flex items-center gap-1 mb-1"
                >
                  <span className="w-6 text-center text-xs font-medium text-zinc-500">
                    {row.row_code}
                  </span>
                  <div className="flex gap-1">
                    {row.seats.map((seat, seatIndex) => {
                      const kind = getSeatKind(seat.seat_type_id, seatTypes);
                      const colors = SEAT_COLORS[kind] ?? SEAT_COLORS.standard!;

                      return (
                        <button
                          key={`${row.row_code}-${seat.column_number}`}
                          type="button"
                          onClick={() => toggleSeat(rowIndex, seatIndex)}
                          className={`w-8 h-8 rounded text-[10px] font-medium border transition-all hover:scale-110 ${colors.bg} ${colors.border} ${colors.text} ${seat.accessible ? "ring-1 ring-blue-400 ring-offset-1 ring-offset-zinc-900" : ""}`}
                          title={`${row.row_code}${seat.column_number} — ${colors.label}${seat.accessible ? " (Acessível)" : ""}`}
                        >
                          {seat.column_number}
                        </button>
                      );
                    })}
                  </div>
                  <span className="w-6 text-center text-xs font-medium text-zinc-500">
                    {row.row_code}
                  </span>
                </div>
              ))}

              {/* Column numbers */}
              <div className="flex items-center gap-1 mt-2 ml-7">
                {formData.seat_layout[0]?.seats.map((seat) => (
                  <div
                    key={`col-${seat.column_number}`}
                    className="w-8 text-center text-[10px] text-zinc-600"
                  >
                    {seat.column_number}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
            <span className="text-xs text-zinc-500">Legenda:</span>
            {Object.entries(SEAT_COLORS).map(([kind, colors]) => {
              if (kind === "empty") return null;
              return (
                <div
                  key={kind}
                  className="flex items-center gap-1.5 text-xs text-zinc-400"
                >
                  <div
                    className={`w-4 h-4 rounded border ${colors.bg} ${colors.border}`}
                  />
                  {colors.label}
                </div>
              );
            })}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <div className="w-4 h-4 rounded border bg-zinc-700 border-zinc-600 ring-1 ring-blue-400 ring-offset-1 ring-offset-zinc-900" />
              Acessível
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/rooms")}
            className="px-4 py-2 rounded-md border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-accent-red hover:bg-accent-red-hover text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEditing ? "Salvar Alterações" : "Criar Sala"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function RoomFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center gap-2 py-12 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Carregando...
        </div>
      }
    >
      <RoomFormInner />
    </Suspense>
  );
}
