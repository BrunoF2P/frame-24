"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useSeatsMap } from "@/hooks/use-seats";
import { useSeatReservation } from "@/hooks/use-seat-reservation";
import { useCompany } from "@/hooks/use-company";
import { useAuth } from "@/contexts/auth-context";

interface CompanySummary {
  id?: string;
}

interface SeatsMapResponse {
  seats?: Seat[];
  available_seats?: number;
  room_id?: string;
}

interface Seat {
  id: string;
  seat_code: string;
  row_code: string;
  column_number: number;
  accessible: boolean;
  status: string;
  reserved: boolean;
  reserved_until: string | null;
}

export default function ShowtimePage({
  params,
}: {
  params: Promise<{ tenant_slug: string; id: string }>;
}) {
  const { tenant_slug, id: showtimeId } = use(params);
  const router = useRouter();

  const { data: company } = useCompany(tenant_slug);
  const { data: seatsData, isLoading } = useSeatsMap(showtimeId);

  const { user, isAuthenticated } = useAuth();

  const { connected, reservation, reserveSeats, releaseSeats } =
    useSeatReservation({
      showtimeId: showtimeId,
      companyId: (company as CompanySummary | undefined)?.id || "",
      user,
    });

  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  const seatsMap = (seatsData as SeatsMapResponse | undefined) ?? undefined;
  const seats = seatsMap?.seats ?? [];
  const availableSeats = seatsMap?.available_seats ?? 0;
  const roomId = seatsMap?.room_id;

  // Agrupar assentos por linha
  const seatsByRow = seats.reduce((acc: Record<string, Seat[]>, seat: Seat) => {
    const row = acc[seat.row_code] ?? (acc[seat.row_code] = []);
    row.push(seat);
    return acc;
  }, {});

  const rows = Object.keys(seatsByRow).sort();

  const handleSeatClick = (seat: Seat) => {
    // Verifica se o status é um dos permitidos (Livre, Disponível ou available)
    const isAvailable = ["Livre", "Disponível", "available"].includes(
      seat.status,
    );

    // Não pode selecionar se já está reservado ou não está livre
    if (seat.reserved || !isAvailable) return;

    // Se já tem reserva, não pode selecionar mais assentos
    if (
      reservation.reservationUuid &&
      !reservation.reservedSeatIds.includes(seat.id)
    ) {
      return;
    }

    if (selectedSeats.includes(seat.id)) {
      setSelectedSeats(selectedSeats.filter((id) => id !== seat.id));
    } else {
      setSelectedSeats([...selectedSeats, seat.id]);
    }
  };

  const handleReserve = () => {
    if (selectedSeats.length === 0) return;

    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      router.push(`/${tenant_slug}/auth/login?returnUrl=${returnUrl}`);
      return;
    }

    reserveSeats(selectedSeats);
    setSelectedSeats([]); // Limpa seleção após reservar
  };

  const handleRelease = () => {
    releaseSeats();
  };

  const getSeatStatus = (seat: Seat) => {
    // Meus assentos reservados
    if (reservation.reservedSeatIds.includes(seat.id)) {
      return "my-reserved";
    }
    // Selecionado localmente
    if (selectedSeats.includes(seat.id)) {
      return "selected";
    }
    // Reservado por outros
    if (seat.reserved || seat.status === "Reservado") {
      return "reserved";
    }
    // Vendido
    if (seat.status === "Vendido") {
      return "sold";
    }
    // Bloqueado
    if (seat.status === "Bloqueado") {
      return "sold";
    }
    // Disponível (Adicionado 'Livre' aqui)
    if (
      seat.status === "Disponível" ||
      seat.status === "available" ||
      seat.status === "Livre"
    ) {
      return "available";
    }
    // Fallback
    return "sold";
  };

  const getSeatColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-zinc-700 hover:bg-red-500 cursor-pointer";
      case "selected":
        return "bg-red-400 cursor-pointer";
      case "my-reserved":
        return "bg-green-500 cursor-not-allowed";
      case "reserved":
        return "bg-yellow-600 cursor-not-allowed";
      case "sold":
        return "bg-zinc-900 cursor-not-allowed";
      default:
        return "bg-zinc-700";
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white text-xl">Carregando mapa de assentos...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-zinc-400 hover:text-white mb-4 flex items-center gap-2"
        >
          ← Voltar
        </button>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Selecione seus assentos
            </h1>
            <p className="text-zinc-400">
              {availableSeats} assentos disponíveis
              {roomId && ` • Sala: ${roomId}`}
              {seats.length > 0 && ` • Total: ${seats.length} assentos`}
            </p>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-sm text-zinc-400">
              {connected ? "Conectado" : "Desconectado"}
            </span>
          </div>
        </div>
      </div>

      {/* Timer de Reserva */}
      {reservation.reservationUuid && (
        <div className="mb-6 bg-green-900/20 border border-green-500/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-400 font-semibold">
                Assentos Reservados!
              </div>
              <div className="text-zinc-300 text-sm">
                {reservation.reservedSeatIds.length} assento(s) • Expira em:{" "}
                {formatTime(reservation.timeRemaining)}
              </div>
            </div>
            <button
              onClick={handleRelease}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
            >
              Liberar
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {reservation.error && (
        <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {reservation.error}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        {/* Mapa de Assentos */}
        <div>
          <div className="bg-zinc-900/50 rounded-lg p-6">
            {/* Tela */}
            <div className="mb-8">
              <div className="h-2 bg-gradient-to-b from-zinc-700 to-transparent rounded-t-full mb-2" />
              <div className="text-center text-zinc-500 text-sm">TELA</div>
            </div>

            {/* Assentos */}
            <div className="space-y-3">
              {rows.length === 0 ? (
                <div className="text-center py-12 text-zinc-400">
                  <p className="text-lg mb-2">
                    Nenhum assento encontrado para esta sala.
                  </p>
                  <p className="text-sm">Sessão ID: {showtimeId}</p>
                  {roomId && <p className="text-sm">Sala ID: {roomId}</p>}
                </div>
              ) : (
                rows.map((rowCode) => (
                  <div key={rowCode} className="flex items-center gap-2">
                    <div className="w-8 text-zinc-400 font-semibold text-sm">
                      {rowCode}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(seatsByRow[rowCode] ?? [])
                        .sort(
                          (a: Seat, b: Seat) =>
                            a.column_number - b.column_number,
                        )
                        .map((seat: Seat) => {
                          const status = getSeatStatus(seat);
                          return (
                            <button
                              key={seat.id}
                              onClick={() => handleSeatClick(seat)}
                              className={`w-8 h-8 rounded-md text-xs font-semibold transition-all ${getSeatColor(status)}`}
                              disabled={
                                status === "reserved" ||
                                status === "sold" ||
                                status === "my-reserved"
                              }
                              title={`${seat.row_code}${seat.column_number} - ${status}`}
                            >
                              {seat.column_number}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Legenda */}
            <div className="mt-8 pt-6 border-t border-zinc-800">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-zinc-700 rounded-md" />
                  <span className="text-zinc-400">Disponível</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-400 rounded-md" />
                  <span className="text-zinc-400">Selecionado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded-md" />
                  <span className="text-zinc-400">Sua Reserva</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-yellow-600 rounded-md" />
                  <span className="text-zinc-400">Reservado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-zinc-900 rounded-md" />
                  <span className="text-zinc-400">Ocupado</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div>
          <div className="bg-zinc-900/50 rounded-lg p-6 sticky top-24">
            <h3 className="text-xl font-bold text-white mb-4">Resumo</h3>

            <div className="space-y-3 mb-6">
              <div>
                <div className="text-zinc-400 text-sm">
                  Assentos Selecionados
                </div>
                <div className="text-white font-semibold">
                  {selectedSeats.length > 0
                    ? selectedSeats.length
                    : reservation.reservedSeatIds.length > 0
                      ? reservation.reservedSeatIds.length
                      : "Nenhum"}
                </div>
              </div>
            </div>

            {selectedSeats.length > 0 && !reservation.reservationUuid && (
              <button
                onClick={handleReserve}
                disabled={reservation.isReserving}
                className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                {reservation.isReserving
                  ? "Reservando..."
                  : "Reservar Assentos"}
              </button>
            )}

            {reservation.reservationUuid && (
              <button
                onClick={() =>
                  router.push(`/${tenant_slug}/showtime/${showtimeId}/tickets`)
                }
                className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
              >
                Continuar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
