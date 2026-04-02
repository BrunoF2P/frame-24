"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSeatReservation } from "@/hooks/use-seat-reservation";
import { useShowtimeDetails } from "@/hooks/use-showtime-details";
import { useCompany } from "@/hooks/use-company";
import { api } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  category_id: string;
}

interface CompanySummary {
  id?: string;
}

interface TicketTypeOption {
  id: string;
  price_modifier?: number;
  discount_percentage?: number;
}

interface ShowtimeSeat {
  id: string;
  additional_value?: number | string;
}

interface ShowtimeSummary {
  base_ticket_price: number | string;
  cinema?: { id?: string; name?: string };
  movie?: { title?: string };
  seats: ShowtimeSeat[];
}

export default function ProductSelectionPage({
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
    user: null,
  });

  const { data: showtime } = useShowtimeDetails(id);
  const showtimeData = showtime as ShowtimeSummary | undefined;
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Novo estado para o valor dos ingressos
  const [ticketsTotalValue, setTicketsTotalValue] = useState(0);

  // Redirecionar se não houver reserva
  useEffect(() => {
    if (
      isInitialized &&
      (!reservation.reservationUuid || reservation.reservedSeatIds.length === 0)
    ) {
      router.replace(`/${tenant_slug}/showtime/${id}`);
    }
  }, [isInitialized, reservation, router, tenant_slug, id]);

  // 1. Carregar valor dos ingressos e Produtos
  useEffect(() => {
    async function loadData() {
      try {
        // A. Carregar Seleção de Ingressos do LocalStorage
        const savedTicketsJson = localStorage.getItem(`selected-tickets-${id}`);
        const selectedTickets = savedTicketsJson
          ? JSON.parse(savedTicketsJson)
          : {};

        // B. Carregar Cart do LocalStorage
        const savedCart = localStorage.getItem(`cart-${id}`);
        if (savedCart) setCart(JSON.parse(savedCart));

        // C. Buscar Tipos de Ingresso (Para calcular o total)
        const ticketsRes = await api.get(
          `/public/companies/${tenant_slug}/ticket-types`,
        );
        const ticketTypes = Array.isArray(ticketsRes.data)
          ? (ticketsRes.data as TicketTypeOption[])
          : [];

        // D. Buscar Produtos
        const complexId = showtimeData?.cinema?.id;
        const productsRes = await api.get(
          `/public/companies/${tenant_slug}/products`,
          {
            params: { complex_id: complexId },
          },
        );
        setProducts(productsRes.data);

        // E. Calcular Total dos Ingressos (Lógica idêntica ao Checkout)
        if (showtimeData && reservation.reservedSeatIds.length > 0) {
          const total = reservation.reservedSeatIds.reduce(
            (acc: number, seatId: string) => {
              const typeId = selectedTickets[seatId];
              const type = ticketTypes.find((ticket) => ticket.id === typeId);

              // Detalhes do assento (preço extra)
              const seat = showtimeData.seats.find((seatItem) => seatItem.id === seatId);
              const extra = Number(seat?.additional_value || 0);
              const base = Number(showtimeData.base_ticket_price);

              let multiplier = 1;
              if (type?.price_modifier !== undefined)
                multiplier = Number(type.price_modifier);
              else if (type?.discount_percentage)
                multiplier = 1 - Number(type.discount_percentage) / 100;

              return acc + (base + extra) * multiplier;
            },
            0,
          );

          setTicketsTotalValue(total);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    }

    if (showtimeData && reservation.reservedSeatIds.length > 0) {
      loadData();
    }
  }, [tenant_slug, showtimeData, id, reservation.reservedSeatIds]);

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === 0) {
        const rest = { ...prev };
        delete rest[productId];
        return rest;
      }
      return { ...prev, [productId]: newQty };
    });
  };

  const calculateProductTotal = () => {
    return Object.entries(cart).reduce((total, [productId, qty]) => {
      const product = products.find((p) => p.id === productId);
      return total + (product ? product.price * qty : 0);
    }, 0);
  };

  // Total Geral = Ingressos + Produtos
  const grandTotal = ticketsTotalValue + calculateProductTotal();

  const handleContinue = () => {
    localStorage.setItem(`cart-${id}`, JSON.stringify(cart));
    router.push(`/${tenant_slug}/showtime/${id}/checkout`);
  };

  if (loading || !showtimeData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <header className="bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{showtimeData.movie?.title}</h1>
            <p className="text-sm text-zinc-400">
              Bomboniere • {showtimeData.cinema?.name}
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
          Adicione itens ao seu pedido
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((product) => {
            const quantity = cart[product.id] || 0;
            return (
              <div
                key={product.id}
                className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 flex gap-4"
              >
                <div className="w-24 h-24 bg-zinc-800 rounded-md flex-shrink-0 flex items-center justify-center text-zinc-600">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <span className="text-xs">Sem foto</span>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold">{product.name}</h3>
                    <p className="text-sm text-zinc-400 line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="font-bold text-lg">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(product.price)}
                    </div>
                    <div className="flex items-center gap-3 bg-zinc-800 rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(product.id, -1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                        disabled={quantity === 0}
                      >
                        -
                      </button>
                      <span className="w-4 text-center font-bold">
                        {quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(product.id, 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-zinc-700 rounded transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer com Total ACUMULADO */}
      <footer className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-400 flex gap-2">
              Total Geral
              <span className="text-xs bg-zinc-800 px-2 rounded-full flex items-center">
                Ingressos:{" "}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(ticketsTotalValue)}
              </span>
            </div>
            <div className="text-2xl font-bold text-white">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(grandTotal)}
            </div>
          </div>
          <button
            onClick={handleContinue}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-bold transition-colors flex items-center gap-2"
          >
            Continuar para Pagamento
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
