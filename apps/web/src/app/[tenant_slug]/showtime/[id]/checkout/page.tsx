"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSeatReservation } from "@/hooks/use-seat-reservation";
import { useShowtimeDetails } from "@/hooks/use-showtime-details";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCompany } from "@/hooks/use-company";
import { api } from "@/lib/api";
// Remova ou crie este utilitário se não existir, por enquanto usaremos fallback simples
// import { extractErrorMessage } from '@/lib/error-utils';

interface TicketType {
  id: string;
  name: string;
  price_modifier?: number;
  discount_percentage?: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

interface CompanySummary {
  id?: string;
}

interface PaymentMethod {
  id: string;
  name: string;
}

interface ShowtimeSeat {
  id: string;
  additional_value?: number | string;
}

interface ShowtimeSummary {
  base_ticket_price: number | string;
  seats: ShowtimeSeat[];
  cinema?: { id?: string; name?: string };
  room?: { name?: string };
  movie?: { title?: string; poster_url?: string };
  start_time?: string;
}

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ tenant_slug: string; id: string }>;
}) {
  const { tenant_slug, id } = use(params);
  const router = useRouter();
  const { data: companyData } = useCompany(tenant_slug);
  const company = companyData as CompanySummary | undefined;
  const { user } = useAuth(); // Pegar usuário logado

  // CORREÇÃO 1: Passar o usuário correto para manter a sessão do socket
  const { reservation, isInitialized } = useSeatReservation({
    showtimeId: id,
    companyId: company?.id || "",
    user: user || null,
  });

  const { data: showtime } = useShowtimeDetails(id);
  const showtimeData = showtime as ShowtimeSummary | undefined;

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<
    Record<string, string>
  >({});
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    string | null
  >(null);

  // Redirecionar se não houver reserva
  useEffect(() => {
    if (
      isInitialized &&
      (!reservation.reservationUuid || reservation.reservedSeatIds.length === 0)
    ) {
      router.replace(`/${tenant_slug}/showtime/${id}`);
    }
  }, [isInitialized, reservation, router, tenant_slug, id]);

  // Carregar dados
  useEffect(() => {
    async function loadData() {
      try {
        const savedTickets = localStorage.getItem(`selected-tickets-${id}`);
        const savedCart = localStorage.getItem(`cart-${id}`);

        if (savedTickets) setSelectedTickets(JSON.parse(savedTickets));
        if (savedCart) setCart(JSON.parse(savedCart));

        // Carregar dependências em paralelo
        const [ticketsRes, productsRes, paymentsRes] = await Promise.all([
          api.get(`/public/companies/${tenant_slug}/ticket-types`),
          api.get(
            `/public/companies/${tenant_slug}/products?complex_id=${showtimeData?.cinema?.id}`,
          ),
          api.get(`/public/companies/${tenant_slug}/payment-methods`),
        ]);

        setTicketTypes(ticketsRes.data);
        setProducts(productsRes.data);
        setPaymentMethods(
          Array.isArray(paymentsRes.data)
            ? (paymentsRes.data as PaymentMethod[])
            : [],
        );

        if (Array.isArray(paymentsRes.data) && paymentsRes.data.length > 0) {
          setSelectedPaymentMethod((paymentsRes.data[0] as PaymentMethod).id);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do checkout", error);
      } finally {
        setLoading(false);
      }
    }

    if (showtimeData) {
      loadData();
    }
  }, [tenant_slug, showtimeData, id]);

  const calculateTotal = () => {
    if (!showtimeData) return 0;

    const ticketsTotal = reservation.reservedSeatIds.reduce((total, seatId) => {
      const ticketTypeId = selectedTickets[seatId];
      const ticketType = ticketTypes.find((t) => t.id === ticketTypeId);
      if (!ticketType) return total;

      const seatDetails = showtimeData.seats.find((s) => s.id === seatId);
      const additionalValue = Number(seatDetails?.additional_value || 0);
      const basePrice = Number(showtimeData.base_ticket_price);
      const seatBasePrice = basePrice + additionalValue;

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

    const productsTotal = Object.entries(cart).reduce(
      (total, [productId, qty]) => {
        const product = products.find((p) => p.id === productId);
        return total + (product ? product.price * qty : 0);
      },
      0,
    );

    return ticketsTotal + productsTotal;
  };

  const handleCheckout = async () => {
    if (!selectedPaymentMethod) {
      alert("Selecione um método de pagamento");
      return;
    }

    setProcessing(true);
    try {
      const salePayload = {
        cinema_complex_id: showtimeData?.cinema?.id,
        customer_id: user?.id,
        payment_method: selectedPaymentMethod,
        // Mapeia ingressos com segurança
        tickets: reservation.reservedSeatIds.map((seatId) => {
          const typeId = selectedTickets[seatId];
          if (!typeId)
            throw new Error(`Tipo de ingresso não selecionado para o assento`);
          return {
            showtime_id: id,
            seat_id: seatId,
            ticket_type: typeId,
          };
        }),
        concession_items: Object.entries(cart).map(([itemId, quantity]) => ({
          item_type: "PRODUCT",
          item_id: itemId,
          quantity,
        })),
      };

      const response = await api.post("/public/sales", salePayload);

      if (response.status === 201) {
        localStorage.removeItem(`selected-tickets-${id}`);
        localStorage.removeItem(`cart-${id}`);
        localStorage.removeItem(`seat-reservation-${id}`);

        // Redireciona para confirmação
        router.push(`/${tenant_slug}/confirmation/${response.data.id}`);
      }
    } catch (error: unknown) {
      console.error("Erro no checkout:", error);
      const message =
        error &&
        typeof error === "object" &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response
          ?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Erro ao processar compra.";
      alert(message);
    } finally {
      setProcessing(false);
    }
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
            <h1 className="text-xl font-bold">Checkout</h1>
            <p className="text-sm text-zinc-400">Revise seu pedido</p>
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

      <main className="max-w-4xl mx-auto p-4 mt-8 grid md:grid-cols-[1fr_350px] gap-8">
        <div className="space-y-6">
          {/* Resumo da Sessão */}
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <h3 className="font-bold text-lg mb-4 text-zinc-200">Sessão</h3>
            <div className="flex gap-4">
              {showtimeData.movie?.poster_url && (
                <Image
                  src={showtimeData.movie.poster_url}
                  alt="Poster"
                  width={64}
                  height={96}
                  className="w-16 h-24 object-cover rounded"
                />
              )}
              <div>
                <h4 className="font-bold text-white">
                  {showtimeData.movie?.title}
                </h4>
                <p className="text-zinc-400 text-sm">
                  {showtimeData.cinema?.name} • Sala {showtimeData.room?.name}
                </p>
                <p className="text-zinc-400 text-sm">
                  {showtimeData.start_time &&
                    format(
                      new Date(showtimeData.start_time),
                      "dd 'de' MMMM 'às' HH:mm",
                      { locale: ptBR },
                    )}
                </p>
              </div>
            </div>
          </div>

          {/* Pagamento */}
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <h3 className="font-bold text-lg mb-4 text-zinc-200">Pagamento</h3>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.length === 0 ? (
                <div className="col-span-2 text-center text-zinc-500 py-4">
                  Nenhum método de pagamento disponível. (Rode o seed de
                  pagamentos)
                </div>
              ) : (
                paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className={`p-4 rounded border text-center transition-colors ${
                      selectedPaymentMethod === method.id
                        ? "bg-red-500/10 border-red-500 text-white"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    {method.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Resumo Lateral e Botão de Compra */}
        <div>
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 sticky top-24">
            <h3 className="font-bold text-xl mb-6 text-white">Resumo</h3>

            <div className="space-y-2 mb-6 pb-6 border-b border-zinc-800">
              <div className="flex justify-between text-zinc-400">
                <span>Ingressos ({reservation.reservedSeatIds.length})</span>
                <span>R$ {calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-end mb-8">
              <span className="text-zinc-200 font-bold">Total</span>
              <span className="text-2xl font-bold text-white">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(calculateTotal())}
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={processing || paymentMethods.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold text-lg transition-colors shadow-lg shadow-green-900/20"
            >
              {processing ? "Processando..." : "Finalizar Compra"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
