"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSeatReservation } from "@/hooks/use-seat-reservation";
import { useShowtimeDetails } from "@/hooks/use-showtime-details";
import { useCompany } from "@/hooks/use-company";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/lib/api";

interface TicketType {
  id: string;
  name: string;
  description: string;
  discount_percentage: number;
  price_modifier: number;
}

interface CompanySummary {
  id?: string;
}

export default function TicketSelectionPage({
  params,
}: {
  params: Promise<{ tenant_slug: string; id: string }>;
}) {
  const { tenant_slug, id } = use(params);
  const router = useRouter();
  const { data: companyData } = useCompany(tenant_slug);
  const company = companyData as CompanySummary | undefined;

  const { reservation, isInitialized } = useSeatReservation({
    showtimeId: id,
    companyId: company?.id || "",
    user: null, // ou pegar do contexto de auth se necessário
  });

  const { data: showtime } = useShowtimeDetails(id);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);

  // Redirecionar se não houver reserva
  useEffect(() => {
    if (
      isInitialized &&
      (!reservation.reservationUuid || reservation.reservedSeatIds.length === 0)
    ) {
      router.replace(`/${tenant_slug}/showtime/${id}`);
    }
  }, [isInitialized, reservation, router, tenant_slug, id]);

  // Buscar tipos de ingresso
  useEffect(() => {
    async function fetchTicketTypes() {
      try {
        const response = await api.get(
          `/public/companies/${tenant_slug}/ticket-types`,
        );
        const data = response.data;
        setTicketTypes(data);

        // Pré-selecionar "Inteira" (ou o primeiro tipo) para todos os assentos
        if (data.length > 0) {
          const initialSelection: Record<string, string> = {};
          reservation.reservedSeatIds.forEach((seatId) => {
            initialSelection[seatId] = data[0].id;
          });
          setSelectedTickets(initialSelection);
        }
      } catch (error) {
        console.error("Erro ao buscar tipos de ingresso:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTicketTypes();
  }, [tenant_slug, reservation.reservedSeatIds]);

  const handleTicketChange = (seatId: string, ticketTypeId: string) => {
    setSelectedTickets((prev) => ({
      ...prev,
      [seatId]: ticketTypeId,
    }));
  };

  const calculateTotal = () => {
    if (!showtime) return 0;

    return reservation.reservedSeatIds.reduce((total, seatId) => {
      const ticketTypeId = selectedTickets[seatId];
      const ticketType = ticketTypes.find((t) => t.id === ticketTypeId);
      if (!ticketType) return total;

      // Encontrar detalhes do assento para pegar o valor adicional
      const seatDetails = showtime.seats.find((s) => s.id === seatId);
      const additionalValue = Number(seatDetails?.additional_value || 0);

      const basePrice = Number(showtime.base_ticket_price);

      // Preço base do assento = Preço Sessão + Adicional do Assento
      const seatBasePrice = basePrice + additionalValue;

      // Aplicar modificador de preço (ex: desconto)
      // Assumindo que price_modifier é um multiplicador (1.0 = 100%, 0.5 = 50%)
      // Se não tiver price_modifier, usar discount_percentage
      let multiplier = 1;
      if (
        ticketType.price_modifier !== undefined &&
        ticketType.price_modifier !== null
      ) {
        multiplier = Number(ticketType.price_modifier);
      } else if (ticketType.discount_percentage) {
        multiplier = 1 - Number(ticketType.discount_percentage) / 100;
      }

      return total + seatBasePrice * multiplier;
    }, 0);
  };

  const handleContinue = () => {
    // Salvar seleção no localStorage para persistência entre páginas
    localStorage.setItem(
      `selected-tickets-${id}`,
      JSON.stringify(selectedTickets),
    );
    router.push(`/${tenant_slug}/showtime/${id}/products`);
  };

  if (loading || !showtime) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{showtime.movie?.title}</h1>
            <p className="text-sm text-zinc-400">
              {showtime.cinema?.name} • Sala {showtime.room?.name} •{" "}
              {showtime.start_time &&
                format(new Date(showtime.start_time), "dd/MM 'às' HH:mm", {
                  locale: ptBR,
                })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-400">Tempo restante</div>
            <div className="text-xl font-mono font-bold text-red-500">
              {Math.floor(reservation.timeRemaining / 60)}:
              {(reservation.timeRemaining % 60).toString().padStart(2, "0")}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 mt-8">
        <h2 className="text-2xl font-bold mb-6">
          Selecione os tipos de ingresso
        </h2>

        <div className="space-y-6">
          {reservation.reservedSeatIds.map((seatId) => {
            // Encontrar detalhes do assento
            const seatDetails = showtime.seats.find((s) => s.id === seatId);
            if (!seatDetails) return null;

            return (
              <div
                key={seatId}
                className="bg-zinc-900 rounded-lg p-6 border border-zinc-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center font-bold text-zinc-400">
                      {seatDetails?.row_code}
                      {seatDetails?.column_number}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        Assento {seatDetails?.row_code}
                        {seatDetails?.column_number}
                        {seatDetails?.seat_type_name &&
                          seatDetails.seat_type_name !== "Padrão" && (
                            <span className="ml-2 text-xs bg-yellow-600/20 text-yellow-500 px-2 py-0.5 rounded">
                              {seatDetails.seat_type_name}
                            </span>
                          )}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {seatDetails?.seat_type_name !== "Padrão" &&
                        Number(seatDetails?.additional_value) > 0
                          ? `+ ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(seatDetails?.additional_value))} (Adicional)`
                          : "Assento Padrão"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ticketTypes.map((type) => {
                    const isSelected = selectedTickets[seatId] === type.id;
                    const basePrice = Number(showtime.base_ticket_price);
                    const additionalValue = Number(
                      seatDetails?.additional_value || 0,
                    );

                    // Preço base do assento = Preço Sessão + Adicional do Assento
                    const seatBasePrice = basePrice + additionalValue;

                    let multiplier = 1;
                    if (
                      type.price_modifier !== undefined &&
                      type.price_modifier !== null
                    ) {
                      multiplier = Number(type.price_modifier);
                    } else if (type.discount_percentage) {
                      multiplier = 1 - Number(type.discount_percentage) / 100;
                    }

                    // Preço final = (Preço Base + Adicional) * Multiplicador do Tipo de Ingresso
                    const price = seatBasePrice * multiplier;

                    return (
                      <button
                        key={type.id}
                        onClick={() => handleTicketChange(seatId, type.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isSelected
                            ? "bg-red-500/10 border-red-500 text-white"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-medium">{type.name}</div>
                          {type.description && (
                            <div className="text-xs opacity-70">
                              {type.description}
                            </div>
                          )}
                        </div>
                        <div className="font-bold">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(price)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer com Total e Ação */}
      <footer className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-400">Total</div>
            <div className="text-2xl font-bold text-white">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(calculateTotal())}
            </div>
          </div>
          <button
            onClick={handleContinue}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-bold transition-colors flex items-center gap-2"
          >
            Continuar para Produtos
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}
