"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { customerApi } from "@/lib/api-client";
import {
  getTenantPaymentMethods,
  getTenantProducts,
  getTenantTicketTypes,
} from "@/lib/storefront/api";
import { useAuth } from "@/contexts/auth-context";
import { useCompany } from "@/hooks/use-company";
import { useSeatReservation } from "@/hooks/use-seat-reservation";
import { withTenantPath } from "@/lib/tenant-routing";
import { useShowtimeDetails } from "@/hooks/use-showtime-details";
import { useBookingStore } from "@/stores/use-booking-store";
import { formatCurrency, formatDateTimeInTimeZone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

type TicketTypeOption = {
  id?: string;
  code: string;
  label: string;
  priceModifier?: number;
};

type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
};

type PaymentMethod = {
  id?: string;
  name?: string;
};

type CompanySummary = {
  id?: string;
};

type PaymentAttemptResponse = {
  status?: string;
  sale_id?: string | null;
  public_reference?: string | null;
};

type ShowtimeSeat = {
  id: string;
  seat_code?: string;
  additional_value?: number | string;
};

type ShowtimeSummary = {
  base_ticket_price: number | string;
  seats: ShowtimeSeat[];
  cinema?: { id?: string; name?: string; timezone?: string | null };
  room?: { name?: string };
  movie?: { title?: string; poster_url?: string };
  start_time?: string;
};

export const PlatformCheckoutExperience = ({
  tenantSlug,
  showtimeId,
}: {
  tenantSlug: string;
  showtimeId: string;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, hasSession, isLoading: authLoading } = useAuth();
  const { data: companyData } = useCompany(tenantSlug);
  const company = companyData as CompanySummary | undefined;
  const { data: showtime } = useShowtimeDetails(showtimeId);
  const showtimeData = showtime as ShowtimeSummary | undefined;
  const {
    selectedSessionId,
    selectedSeatIds,
    ticketQuantities,
    productQuantities,
    clearBooking,
  } = useBookingStore();
  const [ticketTypes, setTicketTypes] = useState<TicketTypeOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const attemptedReservationRef = useRef(false);

  const { connected, reservation, reserveSeats } = useSeatReservation({
    showtimeId,
    companyId: company?.id || "",
    tenantSlug,
    user: user || null,
  });

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(`/compra/${showtimeId}`);
      if (hasSession) {
        router.replace(withTenantPath(pathname, `/auth/register?intent=activate&returnUrl=${returnUrl}`));
      } else {
        router.replace(withTenantPath(pathname, `/auth/login?returnUrl=${returnUrl}`));
      }
    }
  }, [authLoading, hasSession, isAuthenticated, pathname, router, showtimeId, tenantSlug]);

  useEffect(() => {
    if (!selectedSeatIds.length || (selectedSessionId && selectedSessionId !== showtimeId)) {
      router.replace(`/cidade`);
    }
  }, [router, selectedSeatIds.length, selectedSessionId, showtimeId]);

  useEffect(() => {
    let cancelled = false;

    if (authLoading || !isAuthenticated || !showtimeData) {
      if (!authLoading && !showtimeData) {
        setLoading(false);
      }
      return;
    }

    const load = async () => {
      try {
        const [types, concessions, methods] = await Promise.all([
          getTenantTicketTypes(tenantSlug),
          getTenantProducts(tenantSlug, showtimeData?.cinema?.id),
          getTenantPaymentMethods(tenantSlug),
        ]);

        if (cancelled) return;

        setTicketTypes(types);
        setProducts(concessions as Product[]);
        setPaymentMethods(methods as PaymentMethod[]);
        setSelectedPaymentMethod((methods[0] as PaymentMethod | undefined)?.id ?? null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, showtimeData, tenantSlug]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !connected ||
      !company?.id ||
      !selectedSeatIds.length ||
      reservation.reservationUuid ||
      reservation.isReserving ||
      attemptedReservationRef.current
    ) {
      return;
    }

    attemptedReservationRef.current = true;
    reserveSeats(selectedSeatIds);
  }, [
    company?.id,
    connected,
    isAuthenticated,
    reservation.isReserving,
    reservation.reservationUuid,
    reserveSeats,
    selectedSeatIds,
  ]);

  const seatAssignments = useMemo(() => {
    const orderedTypes = Object.entries(ticketQuantities).flatMap(([code, quantity]) => {
      const ticketType = ticketTypes.find((item) => item.code === code);
      return ticketType?.id ? Array.from({ length: quantity ?? 0 }, () => ticketType.id as string) : [];
    });

    return reservation.reservedSeatIds.map((seatId, index) => ({
      seat_id: seatId,
      ticket_type: orderedTypes[index],
    }));
  }, [reservation.reservedSeatIds, ticketQuantities, ticketTypes]);

  const selectedSeatLabels = useMemo(() => {
    const ids = reservation.reservedSeatIds.length ? reservation.reservedSeatIds : selectedSeatIds;
    return ids.map((seatId) => {
      const seat = showtimeData?.seats.find((item) => item.id === seatId);
      return seat?.seat_code || seatId;
    });
  }, [reservation.reservedSeatIds, selectedSeatIds, showtimeData?.seats]);

  const total = useMemo(() => {
    if (!showtimeData) return 0;

    const ticketsTotal = seatAssignments.reduce((sum, assignment) => {
      const type = ticketTypes.find((item) => item.id === assignment.ticket_type);
      const seat = showtimeData.seats.find((item) => item.id === assignment.seat_id);
      const base = Number(showtimeData.base_ticket_price) + Number(seat?.additional_value || 0);
      return sum + base * Number(type?.priceModifier ?? 1);
    }, 0);

    const productsTotal = Object.entries(productQuantities).reduce((sum, [productId, quantity]) => {
      const product = products.find((item) => item.id === productId);
      return sum + (product ? product.price * quantity : 0);
    }, 0);

    return ticketsTotal + productsTotal;
  }, [productQuantities, products, seatAssignments, showtimeData, ticketTypes]);

  const handleCheckout = async () => {
    if (!selectedPaymentMethod || !reservation.reservationUuid) {
      return;
    }

    if (seatAssignments.some((item) => !item.ticket_type)) {
      alert("Os tipos de ingresso não batem com os assentos selecionados.");
      return;
    }

    setProcessing(true);
    try {
      const checkoutResponse = await customerApi.customerCheckoutCreateV1(tenantSlug, {
        tenant_slug: tenantSlug,
        showtime_id: showtimeId,
        reservation_uuid: reservation.reservationUuid,
        tickets: seatAssignments,
        concession_items: Object.entries(productQuantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([item_id, quantity]) => ({
            item_type: "PRODUCT",
            item_id,
            quantity,
          })),
      });

      const checkoutId = (checkoutResponse.data as { id?: string } | undefined)?.id;
      if (!checkoutId) {
        throw new Error("Checkout não retornou id.");
      }

      const paymentResponse = await customerApi.customerCheckoutCreatePaymentAttemptV1(
        tenantSlug,
        checkoutId,
        {
          method: selectedPaymentMethod,
          provider: "internal",
        },
        `${reservation.reservationUuid}-${selectedPaymentMethod}`,
      );

      const payment = paymentResponse.data as unknown as PaymentAttemptResponse;
      if (payment.status === "paid") {
        clearBooking();
        router.push(`/pedido/${payment.public_reference || payment.sale_id}`);
        return;
      }

      router.push(`/pagamento/${checkoutId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao finalizar a compra.";
      alert(message);
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || loading || !showtimeData) {
    return (
      <main className="page-shell py-10">
        <Card className="flex min-h-[18rem] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent-red-500" />
        </Card>
      </main>
    );
  }

  return (
    <main className="page-shell grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="space-y-5">
        <Card className="space-y-4">
          <div className="flex items-start gap-4">
            {showtimeData.movie?.poster_url ? (
              <Image
                src={showtimeData.movie.poster_url}
                alt={showtimeData.movie.title || "Poster"}
                width={96}
                height={144}
                className="h-36 w-24 rounded-[var(--radius-sm)] object-cover"
              />
            ) : null}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-accent-red-300">Checkout</p>
              <h1 className="font-display text-4xl">{showtimeData.movie?.title}</h1>
              <p className="text-sm text-foreground-muted">
                {showtimeData.cinema?.name} • Sala {showtimeData.room?.name}
              </p>
              <p className="text-sm text-foreground-muted">
                {showtimeData.start_time
                  ? formatDateTimeInTimeZone(
                      showtimeData.start_time,
                      showtimeData.cinema?.timezone || undefined,
                    )
                  : ""}
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-xl font-semibold">Pagamento</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {paymentMethods.map((method) => (
              <Button
                key={method.id || method.name}
                type="button"
                variant={selectedPaymentMethod === method.id ? "primary" : "secondary"}
                onClick={() => setSelectedPaymentMethod(method.id ?? null)}
              >
                {method.name}
              </Button>
            ))}
          </div>
          {reservation.error ? (
            <p className="text-sm text-danger">{reservation.error}</p>
          ) : null}
          {!reservation.reservationUuid ? (
            <p className="text-sm text-foreground-muted">Reservando assentos no backend...</p>
          ) : null}
        </Card>
      </section>

      <aside className="space-y-4">
        <Card className="space-y-3">
          <h2 className="text-xl font-semibold">Resumo</h2>
          <div className="space-y-2">
            <p className="text-sm text-foreground-muted">Assentos</p>
            <div className="flex flex-wrap gap-2">
              {selectedSeatLabels.map((seatLabel) => (
                <span
                  key={seatLabel}
                  className="inline-flex min-w-12 items-center justify-center rounded-full border border-accent-red-500/20 bg-accent-red-500/8 px-3 py-1 text-sm font-semibold text-foreground"
                >
                  {seatLabel}
                </span>
              ))}
            </div>
          </div>
          <p className="text-sm text-foreground-muted">
            Ingressos: {Object.values(ticketQuantities).reduce((sum, quantity) => sum + (quantity ?? 0), 0)}
          </p>
          <p className="text-lg font-semibold">{formatCurrency(total)}</p>
          <Button
            className="w-full"
            disabled={processing || !reservation.reservationUuid || !selectedPaymentMethod}
            onClick={handleCheckout}
            size="lg"
            type="button"
          >
            <Icon name="ticket" size="sm" />
            {processing ? "Processando..." : "Pagar agora"}
          </Button>
        </Card>
      </aside>
    </main>
  );
};
