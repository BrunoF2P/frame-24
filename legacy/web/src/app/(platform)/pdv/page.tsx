"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { posApi } from "@/lib/api-client";
import { getTenantSlugFromHost, getTenantSlugFromPathname } from "@/lib/tenant-routing";
import { usePdvStore, CartTicket, CartProduct } from "@/stores/use-pdv-store";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { authClient } from "@/lib/auth-client";
import {
  Calculator,
  Film,
  Ticket,
  Popcorn,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  X,
  Plus,
  Minus,
  Search,
  LogOut,
  QrCode,
  Armchair,
  MonitorPlay,
} from "lucide-react";

type PosSession = {
  id: string;
  session_number: string;
  cinema_complex_id: string;
  status: string;
  status_name?: string;
  opening_amount: number;
  total_sales_amount: number;
  total_sales_count: number;
  opened_at: string;
};

type CinemaComplex = {
  id: string;
  name: string;
};

type ShowtimeItem = {
  id: string;
  start_time: string;
  base_ticket_price: number | string;
  movie?: { id: string; title: string; poster_url?: string; duration_minutes?: number };
  room?: { id: string; name: string };
  complex?: { id: string; name: string };
  available_seats?: number | null;
  sold_seats?: number | null;
};

type TicketTypeItem = {
  id: string;
  name: string;
  discount_percentage: number;
  price_modifier: number;
};

type SeatItem = {
  id: string;
  seat_code: string;
  row_code: string;
  column_number: number;
  status: string;
  seat_kind?: string;
  additional_value?: number | string;
};

type ProductItem = {
  id: string;
  name: string;
  sale_price?: number;
  price?: number;
  image_url?: string | null;
  product_code?: string;
};

type PosPaymentMethodItem = {
  id: string;
  name: string;
  requires_change: boolean;
};

type SalesPaymentMethodItem = {
  id: string;
  name: string;
  auto_settle: boolean;
};

type SaleResponse = {
  id: string;
  public_reference?: string;
  sale_number?: string;
};

const STEPS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "session", label: "Caixa", icon: <Calculator className="w-4 h-4" /> },
  { key: "showtime", label: "Sessao", icon: <Film className="w-4 h-4" /> },
  { key: "tickets", label: "Ingressos", icon: <Ticket className="w-4 h-4" /> },
  { key: "products", label: "Lanches", icon: <Popcorn className="w-4 h-4" /> },
  { key: "payment", label: "Pagamento", icon: <CreditCard className="w-4 h-4" /> },
  { key: "confirmation", label: "Confirmacao", icon: <CheckCircle2 className="w-4 h-4" /> },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AuthInlineLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const tenantSlug =
    typeof window !== "undefined"
      ? getTenantSlugFromHost(window.location.host) ?? getTenantSlugFromPathname(window.location.pathname)
      : null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await authClient.signInEmail(
        email.trim().toLowerCase(),
        password,
      );
      if (result?.error) {
        setError(result.error.message || "Erro ao fazer login");
      }
    } catch {
      setError("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4 text-left">
      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground-muted">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm"
          placeholder="admin@lawtrel.com"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground-muted">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm"
          placeholder="........"
          required
        />
      </div>
      {error && <p className="text-sm text-accent-red-500">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Entrar"}
      </Button>
    </form>
  );
}

function QRCodeDisplay({ value, size = 180 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const generateQR = async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        await QRCode.toCanvas(canvas, value, {
          width: size,
          margin: 2,
          color: { dark: "#181410", light: "#faf8f5" },
        });
      } catch {
        ctx.fillStyle = "#f4f1ea";
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = "#6e6258";
        ctx.font = "13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("QR Code indisponivel", size / 2, size / 2);
      }
    };
    void generateQR();
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} className="rounded-lg" />;
}

export default function PdvPage() {
  const { hasSession, isLoading: authLoading } = useAuth();
  const {
    posSessionId,
    posSessionNumber,
    cinemaComplexId,
    selectedShowtimeId,
    cartTickets,
    cartProducts,
    selectedPaymentMethodId,
    cashReceived,
    step,
    lastSaleId,
    lastSaleReference,
    setPosSession,
    setSelectedShowtime,
    addCartTicket,
    removeCartTicket,
    setCartProduct,
    removeCartProduct,
    setPaymentMethod,
    setCashReceived,
    setStep,
    setLastSale,
    resetSale,
    resetAll,
    closePosSession,
  } = usePdvStore();

  const [posSessions, setPosSessions] = useState<PosSession[]>([]);
  const [complexes, setComplexes] = useState<CinemaComplex[]>([]);
  const [showtimes, setShowtimes] = useState<ShowtimeItem[]>([]);
  const [showtimeDetails, setShowtimeDetails] = useState<ShowtimeItem | null>(null);
  const [seats, setSeats] = useState<SeatItem[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PosPaymentMethodItem[]>([]);
  const [salesPaymentMethods, setSalesPaymentMethods] = useState<SalesPaymentMethodItem[]>([]);
  const tenantSlug = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getTenantSlugFromHost(window.location.host) ?? getTenantSlugFromPathname(window.location.pathname);
  }, []);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movieFilter, setMovieFilter] = useState("");
  const [selectedTicketType, setSelectedTicketType] = useState<string>("");
  const [closingSession, setClosingSession] = useState(false);
  const [closeNotes, setCloseNotes] = useState("");
  const [cashCounted, setCashCounted] = useState(0);

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  const loadPosSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await posApi.posSessionsFindAllV1({ status: "Aberta" });
      const sessions = (res.data as unknown[] || []).map((s) => {
        const r = s as Record<string, unknown>;
        return {
          id: String(r.id),
          session_number: String(r.session_number || ""),
          cinema_complex_id: String(r.cinema_complex_id || ""),
          status: String(r.status || ""),
          status_name: String(r.status_name || r.status || ""),
          opening_amount: Number(r.opening_amount || 0),
          total_sales_amount: Number(r.total_sales_amount || 0),
          total_sales_count: Number(r.total_sales_count || 0),
          opened_at: String(r.opened_at || ""),
        } as PosSession;
      });
      setPosSessions(sessions);
      if (sessions.length === 0) {
        const cRes = await posApi.complexesFindAllV1();
        setComplexes((cRes.data as unknown[] || []).map((c) => {
          const r = c as Record<string, unknown>;
          return { id: String(r.id), name: String(r.name || "Complexo") } as CinemaComplex;
        }));
      }
    } catch {
      setError("Erro ao carregar sessoes de caixa.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === "session" && !posSessionId) {
      void loadPosSessions();
    }
  }, [step, posSessionId, loadPosSessions]);

  useEffect(() => {
    if (step !== "showtime" || !cinemaComplexId) return;
    let cancelled = false;
    setLoading(true);
    const today = new Date().toISOString().split("T")[0] || "";
    posApi
      .showtimesFindAllV1({ cinema_complex_id: cinemaComplexId, date: today, limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const items = (res.data as unknown[] || []).map((s) => {
          const r = s as Record<string, unknown>;
          const movie = (r.movie ?? r.movies) as Record<string, unknown> | undefined;
          const room = r.rooms as Record<string, unknown> | undefined;
          const complex = (r.complex ?? r.cinema_complexes) as Record<string, unknown> | undefined;
          return {
            id: String(r.id),
            start_time: String(r.start_time || ""),
            base_ticket_price: Number(r.base_ticket_price || 0),
            movie: movie ? {
              id: String(movie.id || ""),
              title: String(movie.title || movie.brazil_title || movie.original_title || ""),
              poster_url: movie.poster_url ? String(movie.poster_url) : (movie.movie_media ? String((movie.movie_media as Record<string, unknown>[])?.[0]?.media_url || "") : undefined),
              duration_minutes: Number(movie.duration_minutes || 0),
            } : undefined,
            room: room ? { id: String(room.id || ""), name: String(room.name || "") } : undefined,
            complex: complex ? { id: String(complex.id || ""), name: String(complex.name || "") } : undefined,
            available_seats: r.available_seats != null ? Number(r.available_seats) : null,
            sold_seats: r.sold_seats != null ? Number(r.sold_seats) : null,
          } as ShowtimeItem;
        });
        setShowtimes(items);
      })
      .catch(() => setError("Erro ao carregar sessoes de filme."))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [step, cinemaComplexId]);

  useEffect(() => {
    if (step !== "tickets" || !selectedShowtimeId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      posApi.showtimesFindOneV1(selectedShowtimeId),
      posApi.showtimesSeatsV1(selectedShowtimeId),
      posApi.ticketTypesFindAllV1(),
    ])
      .then(([detailRes, seatsRes, typesRes]) => {
        if (cancelled) return;
        const detail = detailRes.data as Record<string, unknown>;
        const movie = (detail.movie ?? detail.movies) as Record<string, unknown> | undefined;
        const room = (detail.room ?? detail.rooms) as Record<string, unknown> | undefined;
        setShowtimeDetails({
          id: String(detail.id),
          start_time: String(detail.start_time || ""),
          base_ticket_price: Number(detail.base_ticket_price || 0),
          movie: movie ? {
            id: String(movie.id || ""),
            title: String(movie.title || movie.brazil_title || movie.original_title || ""),
            poster_url: movie.poster_url ? String(movie.poster_url) : (movie.movie_media ? String((movie.movie_media as Record<string, unknown>[])?.[0]?.media_url || "") : undefined),
            duration_minutes: Number(movie.duration_minutes || 0),
          } : undefined,
          room: room ? { id: String(room.id || ""), name: String(room.name || "") } : undefined,
        } as ShowtimeItem);

        const seatsData = seatsRes.data as Record<string, unknown>;
        const seatsList = (Array.isArray(seatsData) ? seatsData : (seatsData?.seats as unknown[] || [])) as unknown[];
        setSeats(
          seatsList.map((s) => {
            const r = s as Record<string, unknown>;
            const statusObj = typeof r.status === "object" && r.status !== null ? r.status as Record<string, unknown> : null;
            const statusStr = statusObj ? String(statusObj.name || "available") : String(r.status || "available");
            return {
              id: String(r.seat_id ?? r.id ?? ""),
              seat_code: String(r.seat_code || `${r.row ?? r.row_code ?? ""}${r.number ?? r.column_number ?? ""}`),
              row_code: String(r.row ?? r.row_code ?? ""),
              column_number: Number(r.number ?? r.column_number ?? 0),
              status: statusStr.toLowerCase(),
              seat_kind: String(r.seat_kind ?? r.kind ?? "standard"),
              additional_value: r.additional_value != null ? Number(r.additional_value) : 0,
            } as SeatItem;
          }),
        );

        const loadedTypes = (typesRes.data as unknown[] || []).map((t) => {
          const r = t as Record<string, unknown>;
          return {
            id: String(r.id),
            name: String(r.name || ""),
            discount_percentage: Number(r.discount_percentage || 0),
            price_modifier: Number(r.price_modifier ?? 1),
          } as TicketTypeItem;
        });
        setTicketTypes(loadedTypes);
        if (!selectedTicketType && loadedTypes.length > 0) {
          const inteira = loadedTypes.find((tt) => tt.name.toLowerCase().includes("inteira"));
          setSelectedTicketType(inteira?.id || loadedTypes[0]?.id || "");
        }
      })
      .catch(() => setError("Erro ao carregar dados da sessao."))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [step, selectedShowtimeId]);

  useEffect(() => {
    if (step !== "products") return;
    let cancelled = false;
    setLoading(true);
    Promise.all([posApi.productsFindAllV1({ active: true }), posApi.posPaymentMethodsV1()])
      .then(([prodRes, pmRes]) => {
        if (cancelled) return;
        setProducts(
          (prodRes.data as unknown[] || []).map((p) => {
            const r = p as Record<string, unknown>;
            return {
              id: String(r.id),
              name: String(r.name || ""),
              sale_price: Number(r.sale_price || r.price || 0),
              price: Number(r.price || r.sale_price || 0),
              image_url: r.image_url ? String(r.image_url) : null,
              product_code: String(r.product_code || ""),
            } as ProductItem;
          }),
        );
        setPaymentMethods(
          (pmRes.data as unknown[] || []).map((m) => {
            const r = m as Record<string, unknown>;
            return {
              id: String(r.id),
              name: String(r.name || ""),
              requires_change: Boolean(r.requires_change),
            } as PosPaymentMethodItem;
          }),
        );
        if (tenantSlug) {
          posApi.salesPaymentMethodsV1(tenantSlug).then((spmRes) => {
            if (cancelled) return;
            setSalesPaymentMethods(
              (spmRes.data as unknown[] || []).map((m) => {
                const r = m as Record<string, unknown>;
                return {
                  id: String(r.id),
                  name: String(r.name || ""),
                  auto_settle: Boolean(r.auto_settle),
                } as SalesPaymentMethodItem;
              }),
            );
          }).catch(() => {});
        }
      })
      .catch(() => setError("Erro ao carregar produtos."))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [step, tenantSlug]);

  useEffect(() => {
    if (step !== "payment" || paymentMethods.length > 0) return;
    let cancelled = false;
    posApi.posPaymentMethodsV1()
      .then((res) => {
        if (cancelled) return;
        setPaymentMethods(
          (res.data as unknown[] || []).map((m) => {
            const r = m as Record<string, unknown>;
            return { id: String(r.id), name: String(r.name || ""), requires_change: Boolean(r.requires_change) } as PosPaymentMethodItem;
          }),
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [step, paymentMethods.length]);

  useEffect(() => {
    if (!selectedTicketType && ticketTypes.length > 0) {
      const inteira = ticketTypes.find((tt) => tt.name.toLowerCase().includes("inteira"));
      setSelectedTicketType(inteira?.id || ticketTypes[0]?.id || "");
    }
  }, [ticketTypes, selectedTicketType]);

  const ticketsTotal = useMemo(() => cartTickets.reduce((sum, t) => sum + t.price, 0), [cartTickets]);
  const productsTotal = useMemo(() => cartProducts.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0), [cartProducts]);
  const grandTotal = useMemo(() => ticketsTotal + productsTotal, [ticketsTotal, productsTotal]);

  const changeAmount = useMemo(() => {
    const selectedPm = paymentMethods.find((m) => m.id === selectedPaymentMethodId);
    if (selectedPm?.requires_change && cashReceived > grandTotal) {
      return cashReceived - grandTotal;
    }
    return 0;
  }, [cashReceived, grandTotal, selectedPaymentMethodId, paymentMethods]);

  const availableSeats = useMemo(() => {
    return seats.filter(
      (s) => s.status === "available" || s.status === "disponivel" || s.status === "disponivel" || s.status === "livre",
    );
  }, [seats]);

  const handleOpenSession = async (complexId: string, complexName: string, openingAmount: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await posApi.posSessionsCreateV1({
        cinema_complex_id: complexId,
        opening_amount: openingAmount,
      });
      const data = res.data as Record<string, unknown>;
      setPosSession(
        String(data.id),
        String(data.session_number || `Caixa-${complexName}`),
        complexId,
      );
    } catch {
      setError("Erro ao abrir caixa.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExistingSession = (session: PosSession) => {
    setPosSession(session.id, session.session_number, session.cinema_complex_id);
  };

  const handleCloseSession = async () => {
    if (!posSessionId) return;
    setClosingSession(true);
    setError(null);
    try {
      await posApi.posSessionsUpdateV1(posSessionId, {
        status: "Fechada",
        cash_counted: cashCounted,
        closing_notes: closeNotes,
      });
      closePosSession();
      setPosSessions([]);
      setCloseNotes("");
      setCashCounted(0);
      void loadPosSessions();
    } catch {
      setError("Erro ao fechar caixa.");
    } finally {
      setClosingSession(false);
    }
  };

  const handleSeatClick = (seat: SeatItem) => {
    if (!selectedTicketType || !showtimeDetails) return;
    const isAvailable =
      seat.status === "available" ||
      seat.status === "disponivel" ||
      seat.status === "disponivel" ||
      seat.status === "livre";
    if (!isAvailable) return;

    const existingIdx = cartTickets.findIndex((t) => t.seatId === seat.id);
    if (existingIdx >= 0) {
      removeCartTicket(seat.id);
      return;
    }

    const tt = ticketTypes.find((t) => t.id === selectedTicketType);
    if (!tt) return;

    const basePrice = Number(showtimeDetails.base_ticket_price);
    const additional = Number(seat.additional_value || 0);
    const price = (basePrice + additional) * tt.price_modifier;

    addCartTicket({
      showtimeId: selectedShowtimeId!,
      ticketTypeId: tt.id,
      ticketTypeName: tt.name,
      seatId: seat.id,
      seatLabel: seat.seat_code,
      rowCode: seat.row_code,
      price,
    });
  };

  const handleProcessSale = async () => {
    if (!posSessionId || !selectedPaymentMethodId || !selectedShowtimeId) return;
    if (cartTickets.length === 0 && cartProducts.length === 0) return;

    setProcessing(true);
    setError(null);
    try {
      const selectedPosPm = paymentMethods.find((m) => m.id === selectedPaymentMethodId);
      const salesPm = selectedPosPm
        ? salesPaymentMethods.find((spm) =>
            spm.name.toLowerCase().replace(/\s+/g, " ") === selectedPosPm.name.toLowerCase().replace(/\s+/g, " "),
          )
        : null;

      const salePayload: Record<string, unknown> = {
        cinema_complex_id: cinemaComplexId,
        payment_method: salesPm?.id || selectedPaymentMethodId,
        tickets: cartTickets.map((t) => ({
          showtime_id: t.showtimeId,
          seat_id: t.seatId,
          ticket_type: t.ticketTypeId,
        })),
        concession_items: cartProducts
          .filter((p) => p.quantity > 0)
          .map((p) => ({
            item_type: "PRODUCT",
            item_id: p.productId,
            quantity: p.quantity,
          })),
      };

      const saleRes = await posApi.salesCreateV1(salePayload);
      const saleData = saleRes.data as SaleResponse;
      const saleId = saleData.id;
      const saleRef = saleData.public_reference || saleData.sale_number || saleId;

      await posApi.posTransactionsCreateV1({
        pos_session_id: posSessionId,
        transaction_type: "sale",
        payment_method: selectedPaymentMethodId,
        amount: grandTotal,
        change_amount: changeAmount > 0 ? changeAmount : 0,
        description: `${cartTickets.length} ingresso(s)${cartProducts.length > 0 ? ` + ${cartProducts.reduce((s, p) => s + p.quantity, 0)} produto(s)` : ""}`,
        reference_type: "sale",
        reference_id: saleId,
      });

      setLastSale(saleId, saleRef);
      setStep("confirmation");
    } catch (err: unknown) {
      let msg = "Erro ao processar venda.";
      if (err && typeof err === "object" && "response" in err) {
        const resp = (err as { response?: { data?: { message?: unknown } } }).response;
        if (resp?.data?.message) {
          const m = resp.data.message;
          msg = Array.isArray(m) ? m.join(" | ") : String(m);
        }
      }
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const goNext = () => {
    const idx = STEPS.findIndex((s) => s.key === step);
    const next = STEPS[idx + 1];
    if (next) setStep(next.key as typeof step);
  };

  const goBack = () => {
    const idx = STEPS.findIndex((s) => s.key === step);
    const prev = STEPS[idx - 1];
    if (prev) setStep(prev.key as typeof step);
  };

  const canAdvance = useMemo(() => {
    switch (step) {
      case "session": return !!posSessionId;
      case "showtime": return !!selectedShowtimeId;
      case "tickets": return cartTickets.length > 0;
      case "products": return true;
      case "payment": return !!selectedPaymentMethodId && grandTotal > 0;
      default: return false;
    }
  }, [step, posSessionId, selectedShowtimeId, cartTickets.length, selectedPaymentMethodId, grandTotal]);

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent-red-500" />
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-sm w-full text-center space-y-6 p-8 animate-fade-in-up">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-accent-red-500/10 flex items-center justify-center animate-pulse-glow">
              <Calculator className="w-8 h-8 text-accent-red-500" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold">Frente de Caixa</h1>
          <p className="text-sm text-foreground-muted">
            Faca login para acessar o caixa
          </p>
          <AuthInlineLogin />
        </Card>
      </main>
    );
  }

  if (loading && step === "session" && posSessions.length === 0 && !posSessionId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent-red-500" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background-elevated/95 backdrop-blur-xl">
        <div className="px-4 py-3 flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-red-500/10 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-accent-red-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display leading-tight">
                {posSessionNumber || "Caixa"}
              </h1>
              {posSessionNumber && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Caixa Aberto
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-accent-red-500 tabular-nums">
              {formatCurrency(grandTotal)}
            </span>
            {posSessionId && step !== "confirmation" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Fechar caixa? A sessao sera encerrada.")) {
                    setClosingSession(true);
                  }
                }}
                className="text-foreground-muted hover:text-accent-red-500"
              >
                <LogOut className="w-4 h-4" />
                Fechar
              </Button>
            )}
            {step !== "session" && !closingSession && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Cancelar operacao? Dados da venda atual serao perdidos.")) {
                    resetSale();
                  }
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="px-4 pb-2 flex gap-1 overflow-x-auto max-w-[1600px] mx-auto">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => { if (i < currentStepIndex) setStep(s.key as typeof step); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                i === currentStepIndex
                  ? "bg-accent-red-500 text-white shadow-md shadow-accent-red-500/20"
                  : i < currentStepIndex
                  ? "bg-surface text-foreground cursor-pointer hover:bg-background-strong"
                  : "text-foreground-muted/50"
              }`}
              disabled={i > currentStepIndex}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-4">
        {error && (
          <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-accent-red-500/10 border border-accent-red-500/30 text-accent-red-400 text-sm animate-fade-in-up">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">
              Fechar
            </button>
          </div>
        )}

        {closingSession && (
          <CloseSessionDialog
            sessionNumber={posSessionNumber || ""}
            cashCounted={cashCounted}
            onCloseCashCounted={setCashCounted}
            closeNotes={closeNotes}
            onCloseNotes={setCloseNotes}
            onConfirm={handleCloseSession}
            onCancel={() => setClosingSession(false)}
            processing={closingSession && !error}
          />
        )}

        {!closingSession && step === "session" && (
          <SessionStep
            sessions={posSessions}
            complexes={complexes}
            onSelect={handleSelectExistingSession}
            onOpen={handleOpenSession}
            loading={loading}
          />
        )}

        {!closingSession && step === "showtime" && (
          <ShowtimeStep
            showtimes={showtimes}
            selectedId={selectedShowtimeId}
            onSelect={(id) => setSelectedShowtime(id)}
            movieFilter={movieFilter}
            onMovieFilterChange={setMovieFilter}
            loading={loading}
          />
        )}

        {!closingSession && step === "tickets" && (
          <TicketsStep
            showtimeDetails={showtimeDetails}
            seats={seats}
            availableSeats={availableSeats}
            ticketTypes={ticketTypes}
            cartTickets={cartTickets}
            selectedTicketType={selectedTicketType}
            onTicketTypeChange={setSelectedTicketType}
            onSeatClick={handleSeatClick}
            onRemoveTicket={removeCartTicket}
            loading={loading}
          />
        )}

        {!closingSession && step === "products" && (
          <ProductsStep
            products={products}
            cartProducts={cartProducts}
            onSetProduct={setCartProduct}
            onRemoveProduct={removeCartProduct}
            loading={loading}
          />
        )}

        {!closingSession && step === "payment" && (
          <PaymentStep
            paymentMethods={paymentMethods}
            selectedMethodId={selectedPaymentMethodId}
            onMethodChange={setPaymentMethod}
            cashReceived={cashReceived}
            onCashReceivedChange={setCashReceived}
            grandTotal={grandTotal}
            changeAmount={changeAmount}
            cartTickets={cartTickets}
            cartProducts={cartProducts}
            processing={processing}
            onConfirm={handleProcessSale}
          />
        )}

        {!closingSession && step === "confirmation" && (
          <ConfirmationStep
            saleId={lastSaleId}
            saleReference={lastSaleReference}
            grandTotal={grandTotal}
            cartTickets={cartTickets}
            cartProducts={cartProducts}
            onNewSale={resetSale}
          />
        )}

        {!closingSession && step !== "confirmation" && step !== "session" && (
          <div className="mt-6 flex justify-between items-center">
            <Button
              variant="secondary"
              onClick={goBack}
              disabled={currentStepIndex <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>
            {step !== "payment" && (
              <Button
                variant="primary"
                onClick={goNext}
                disabled={!canAdvance}
              >
                Proximo
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function CloseSessionDialog({
  sessionNumber,
  cashCounted,
  onCloseCashCounted,
  closeNotes,
  onCloseNotes,
  onConfirm,
  onCancel,
  processing,
}: {
  sessionNumber: string;
  cashCounted: number;
  onCloseCashCounted: (v: number) => void;
  closeNotes: string;
  onCloseNotes: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  processing: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-up">
      <Card className="max-w-md w-full space-y-5 p-6 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-red-500/10 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-accent-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold">Fechar Caixa</h2>
            <p className="text-sm text-foreground-muted">{sessionNumber}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1.5 text-foreground-muted font-medium">
              Valor contado em caixa (R$)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="w-full bg-background-strong border border-border rounded-[var(--radius-sm)] p-2.5 text-foreground text-lg font-mono"
              value={cashCounted || ""}
              onChange={(e) => onCloseCashCounted(Number(e.target.value))}
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-foreground-muted font-medium">
              Observacoes (opcional)
            </label>
            <textarea
              className="w-full bg-background-strong border border-border rounded-[var(--radius-sm)] p-2.5 text-foreground text-sm resize-none"
              rows={2}
              value={closeNotes}
              onChange={(e) => onCloseNotes(e.target.value)}
              placeholder="Notas sobre o fechamento..."
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={processing}>
            Cancelar
          </Button>
          <Button variant="primary" className="flex-1" onClick={onConfirm} disabled={processing}>
            {processing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Fechar Caixa"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function SessionStep({
  sessions,
  complexes,
  onSelect,
  onOpen,
  loading,
}: {
  sessions: PosSession[];
  complexes: CinemaComplex[];
  onSelect: (s: PosSession) => void;
  onOpen: (complexId: string, complexName: string, openingAmount: number) => void;
  loading: boolean;
}) {
  const [openingAmount, setOpeningAmount] = useState(200);
  const [selectedComplex, setSelectedComplex] = useState<string>("");

  if (loading) {
    return (
      <Card className="flex items-center justify-center min-h-[12rem]">
        <Loader2 className="w-6 h-6 animate-spin text-accent-red-500" />
      </Card>
    );
  }

  if (sessions.length > 0) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <h2 className="text-2xl font-display font-bold">Caixas Abertos</h2>
        <p className="text-foreground-muted text-sm">Selecione um caixa ativo para continuar:</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={`cinema-card glass-panel rounded-[var(--radius-lg)] border border-border/90 p-5 text-left hover:border-accent-red-500/50 transition-all duration-200 animate-fade-in-up`}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-accent-red-500/10 flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-accent-red-500" />
                </div>
                <span className="font-bold">{s.session_number}</span>
                <span className="ml-auto text-xs bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Aberto
                </span>
              </div>
              <p className="text-sm text-foreground-muted">
                Fundo de troco: {formatCurrency(s.opening_amount)}
              </p>
              <p className="text-sm text-foreground-muted">
                Vendas: {s.total_sales_count} ({formatCurrency(s.total_sales_amount)})
              </p>
              <p className="text-xs text-foreground-muted mt-2">
                Aberto em {formatDateTime(s.opened_at)}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h2 className="text-2xl font-display font-bold">Abrir Caixa</h2>
      <p className="text-foreground-muted text-sm">Nenhum caixa aberto. Selecione o complexo e o fundo de troco:</p>
      <Card className="space-y-4 max-w-md animate-fade-in-up animate-fade-in-up-1">
        <div>
          <label className="block text-sm mb-1.5 text-foreground-muted font-medium">
            Complexo
          </label>
          <select
            className="w-full bg-background-strong border border-border rounded-[var(--radius-sm)] p-2.5 text-foreground text-sm"
            value={selectedComplex}
            onChange={(e) => setSelectedComplex(e.target.value)}
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
          <label className="block text-sm mb-1.5 text-foreground-muted font-medium">
            Fundo de Troco (R$)
          </label>
          <input
            type="number"
            min={0}
            step={10}
            className="w-full bg-background-strong border border-border rounded-[var(--radius-sm)] p-2.5 text-foreground text-lg font-mono"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(Number(e.target.value))}
          />
        </div>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!selectedComplex || loading}
          onClick={() => {
            const c = complexes.find((x) => x.id === selectedComplex);
            if (c) onOpen(c.id, c.name, openingAmount);
          }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
          Abrir Caixa
        </Button>
      </Card>
    </div>
  );
}

function ShowtimeStep({
  showtimes,
  selectedId,
  onSelect,
  movieFilter,
  onMovieFilterChange,
  loading,
}: {
  showtimes: ShowtimeItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  movieFilter: string;
  onMovieFilterChange: (v: string) => void;
  loading: boolean;
}) {
  const filtered = movieFilter
    ? showtimes.filter((s) =>
        s.movie?.title?.toLowerCase().includes(movieFilter.toLowerCase()),
      )
    : showtimes;

  const moviesMap = useMemo(() => {
    const map = new Map<string, ShowtimeItem[]>();
    for (const s of filtered) {
      const key = s.movie?.id || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [filtered]);

  if (loading) {
    return (
      <Card className="flex items-center justify-center min-h-[12rem]">
        <Loader2 className="w-6 h-6 animate-spin text-accent-red-500" />
      </Card>
    );
  }

  const today = new Date();
  const todayLabel = today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-display font-bold">Filmes em Cartaz Hoje</h2>
        <p className="text-foreground-muted text-sm capitalize">{todayLabel}</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
        <input
          type="text"
          placeholder="Buscar filme..."
          className="w-full bg-background-strong border border-border rounded-[var(--radius-md)] pl-10 pr-4 py-2.5 text-foreground text-sm"
          value={movieFilter}
          onChange={(e) => onMovieFilterChange(e.target.value)}
        />
      </div>

      {showtimes.length === 0 && (
        <Card className="py-12 text-center">
          <Film className="w-10 h-10 text-foreground-muted/30 mx-auto mb-3" />
          <p className="text-foreground-muted text-sm">
            Nenhuma sessao encontrada para hoje neste complexo.
          </p>
        </Card>
      )}

      {Array.from(moviesMap.entries()).map(([movieId, movieShowtimes], mi) => {
        const movie = movieShowtimes[0]?.movie;
        const sortedShowtimes = [...movieShowtimes].sort((a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
        );
        return (
          <div
            key={movieId}
            className={`cinema-card glass-panel rounded-[var(--radius-lg)] border border-border/90 p-5 animate-fade-in-up`}
            style={{ animationDelay: `${mi * 0.08}s` }}
          >
            <div className="flex gap-4 mb-4">
              {movie?.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-16 h-24 object-cover rounded-lg shadow-md"
                />
              ) : (
                <div className="w-16 h-24 bg-background-strong rounded-lg flex items-center justify-center">
                  <Film className="w-6 h-6 text-foreground-muted/30" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">{movie?.title || "Filme"}</h3>
                {movie?.duration_minutes && (
                  <p className="text-sm text-foreground-muted">{movie.duration_minutes} min</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {sortedShowtimes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`group relative flex flex-col items-center px-4 py-2.5 rounded-[var(--radius-md)] border transition-all duration-200 ${
                    selectedId === s.id
                      ? "border-accent-red-500 bg-accent-red-500/10 shadow-md shadow-accent-red-500/15"
                      : "border-border hover:border-accent-red-500/40 hover:bg-accent-red-500/5"
                  }`}
                >
                  <span className="text-lg font-bold tabular-nums leading-tight">
                    {formatTime(s.start_time)}
                  </span>
                  <span className="text-xs text-foreground-muted mt-0.5">
                    {s.room?.name || "Sala"}
                  </span>
                  {s.available_seats != null && (
                    <span className={`text-xs mt-0.5 ${s.available_seats > 0 ? "text-green-400" : "text-accent-red-400"}`}>
                      {s.available_seats > 0 ? `${s.available_seats} lugares` : "Lotado"}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-accent-red-500 mt-1">
                    {formatCurrency(Number(s.base_ticket_price))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TicketsStep({
  showtimeDetails,
  seats,
  availableSeats,
  ticketTypes,
  cartTickets,
  selectedTicketType,
  onTicketTypeChange,
  onSeatClick,
  onRemoveTicket,
  loading,
}: {
  showtimeDetails: ShowtimeItem | null;
  seats: SeatItem[];
  availableSeats: SeatItem[];
  ticketTypes: TicketTypeItem[];
  cartTickets: CartTicket[];
  selectedTicketType: string;
  onTicketTypeChange: (id: string) => void;
  onSeatClick: (seat: SeatItem) => void;
  onRemoveTicket: (seatId: string) => void;
  loading: boolean;
}) {
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

  const seatsByRow = useMemo(() => {
    const map = new Map<string, SeatItem[]>();
    for (const seat of seats) {
      const row = seat.row_code || "?";
      if (!map.has(row)) map.set(row, []);
      map.get(row)!.push(seat);
    }
    for (const [, rowSeats] of map) {
      rowSeats.sort((a, b) => a.column_number - b.column_number);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [seats]);

  if (loading || !showtimeDetails) {
    return (
      <Card className="flex items-center justify-center min-h-[12rem]">
        <Loader2 className="w-6 h-6 animate-spin text-accent-red-500" />
      </Card>
    );
  }

  const getSeatKindColor = (kind?: string) => {
    switch (kind?.toLowerCase()) {
      case "premium": return "bg-gold-500/20 border-gold-500/40";
      case "vip": return "bg-accent-red-500/15 border-accent-red-500/30";
      case "casal": return "bg-pink-500/15 border-pink-500/30";
      case "pcd":
      case "acompanhante": return "bg-blue-500/15 border-blue-500/30";
      default: return "";
    }
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-display font-bold">
          {showtimeDetails.movie?.title || "Filme"}
        </h2>
        <p className="text-foreground-muted text-sm">
          {showtimeDetails.room?.name || "Sala"} &bull;{" "}
          {formatDate(showtimeDetails.start_time)} as{" "}
          {formatTime(showtimeDetails.start_time)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 uppercase tracking-wider text-foreground-muted">
              Tipo de Ingresso
            </h3>
            <div className="flex flex-wrap gap-2">
              {ticketTypes.map((tt) => (
                <button
                  key={tt.id}
                  onClick={() => onTicketTypeChange(tt.id)}
                  className={`px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-200 ${
                    selectedTicketType === tt.id
                      ? "bg-accent-red-500 text-white shadow-md shadow-accent-red-500/20"
                      : "bg-surface border border-border text-foreground hover:border-accent-red-500/40"
                  }`}
                >
                  {tt.name}
                  {tt.discount_percentage > 0 && (
                    <span className="ml-1 text-xs opacity-70">
                      (-{tt.discount_percentage}%)
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                Mapa de Assentos
              </h3>
              <span className="text-xs text-foreground-muted">
                {availableSeats.length} disponiveis
              </span>
            </div>
            <div className="glass-panel rounded-[var(--radius-lg)] border border-border/90 p-5 overflow-x-auto">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center gap-2 px-6 py-1.5 bg-background-strong rounded-full border border-border/60">
                  <MonitorPlay className="w-4 h-4 text-foreground-muted" />
                  <span className="text-xs text-foreground-muted font-medium tracking-wider">TELA</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-center">
                {seatsByRow.map(([row, rowSeats]) => (
                  <div key={row} className="flex gap-1.5 items-center">
                    <span className="w-6 text-right text-xs text-foreground-muted font-mono">
                      {row}
                    </span>
                    {rowSeats.map((seat) => {
                      const isSelected = cartTickets.some(
                        (t) => t.seatId === seat.id,
                      );
                      const isAvail =
                        seat.status === "available" ||
                        seat.status === "disponivel" ||
                        seat.status === "disponivel" ||
                        seat.status === "livre";
                      const isHovered = hoveredSeat === seat.id;
                      const kindColor = getSeatKindColor(seat.seat_kind);

                      return (
                        <button
                          key={seat.id}
                          onClick={() => onSeatClick(seat)}
                          onMouseEnter={() => setHoveredSeat(seat.id)}
                          onMouseLeave={() => setHoveredSeat(null)}
                          disabled={!isAvail && !isSelected}
                          className={`relative w-9 h-9 rounded-lg text-xs font-medium transition-all duration-200 transform ${
                            isSelected
                              ? "bg-accent-red-500 text-white scale-110 shadow-md shadow-accent-red-500/30 z-10"
                              : isAvail
                              ? `${kindColor || "bg-surface border border-border"} hover:border-accent-red-500 hover:scale-110 hover:shadow-md hover:shadow-accent-red-500/10 text-foreground`
                              : "bg-background-strong/60 text-foreground-muted/20 cursor-not-allowed"
                          } ${isHovered && isAvail && !isSelected ? "ring-2 ring-accent-red-500/30 ring-offset-1 ring-offset-background" : ""}`}
                          title={`${seat.seat_code} - ${isAvail ? "Disponivel" : "Ocupado"}${seat.seat_kind && seat.seat_kind !== "standard" ? ` (${seat.seat_kind})` : ""}${seat.additional_value ? ` +${formatCurrency(Number(seat.additional_value))}` : ""}`}
                        >
                          {seat.column_number}
                          {isSelected && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                              <CheckCircle2 className="w-2.5 h-2.5 text-accent-red-500" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <span className="w-6 text-xs text-foreground-muted font-mono">
                      {row}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-6 mt-5 pt-4 border-t border-border/40">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-surface border border-border" />
                  <span className="text-xs text-foreground-muted">Disponivel</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-accent-red-500" />
                  <span className="text-xs text-foreground-muted">Selecionado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-background-strong/60" />
                  <span className="text-xs text-foreground-muted">Ocupado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-gold-500/20 border border-gold-500/40" />
                  <span className="text-xs text-foreground-muted">Premium</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-pink-500/15 border border-pink-500/30" />
                  <span className="text-xs text-foreground-muted">Casal</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <Card className="space-y-3 sticky top-36">
            <h3 className="font-semibold flex items-center gap-2">
              <Armchair className="w-4 h-4 text-accent-red-500" />
              Ingressos ({cartTickets.length})
            </h3>
            {cartTickets.length === 0 ? (
              <p className="text-sm text-foreground-muted">
                Clique nos assentos para selecionar
              </p>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {cartTickets.map((t, i) => (
                  <div
                    key={t.seatId}
                    className="flex items-center gap-2 text-sm animate-fade-in-up"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <span className="bg-accent-red-500/10 text-accent-red-400 px-2 py-0.5 rounded text-xs font-mono">
                      {t.seatLabel}
                    </span>
                    <span className="flex-1 text-foreground-muted truncate">
                      {t.ticketTypeName}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(t.price)}
                    </span>
                    <button
                      onClick={() => onRemoveTicket(t.seatId)}
                      className="text-foreground-muted hover:text-accent-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {cartTickets.length > 0 && (
              <div className="pt-2 border-t border-border text-sm font-semibold flex justify-between">
                <span>Subtotal ingressos</span>
                <span className="text-accent-red-500">{formatCurrency(cartTickets.reduce((s, t) => s + t.price, 0))}</span>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProductsStep({
  products,
  cartProducts,
  onSetProduct,
  onRemoveProduct,
  loading,
}: {
  products: ProductItem[];
  cartProducts: CartProduct[];
  onSetProduct: (id: string, name: string, price: number, qty: number) => void;
  onRemoveProduct: (id: string) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.product_code?.toLowerCase().includes(search.toLowerCase()),
      )
    : products;

  if (loading) {
    return (
      <Card className="flex items-center justify-center min-h-[12rem]">
        <Loader2 className="w-6 h-6 animate-spin text-accent-red-500" />
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h2 className="text-2xl font-display font-bold">Lanches e Produtos</h2>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
        <input
          type="text"
          placeholder="Buscar produto..."
          className="w-full bg-background-strong border border-border rounded-[var(--radius-md)] pl-10 pr-4 py-2.5 text-foreground text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => {
            const inCart = cartProducts.find((c) => c.productId === p.id);
            const qty = inCart?.quantity || 0;
            const price = p.sale_price || p.price || 0;
            return (
              <Card
                key={p.id}
                className={`space-y-2 transition-all duration-200 animate-fade-in-up ${qty > 0 ? "border-accent-red-500/40 bg-accent-red-500/5" : ""}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    <p className="text-accent-red-500 font-bold text-sm">
                      {formatCurrency(price)}
                    </p>
                  </div>
                  {p.product_code && (
                    <span className="text-xs text-foreground-muted bg-surface px-1.5 py-0.5 rounded">
                      {p.product_code}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSetProduct(p.id, p.name, price, qty - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] bg-surface border border-border hover:border-accent-red-500/40 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-mono text-sm font-medium">{qty}</span>
                  <button
                    onClick={() => onSetProduct(p.id, p.name, price, qty + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] bg-accent-red-500 text-white transition-all hover:bg-accent-red-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-foreground-muted text-sm col-span-full py-8 text-center">
              Nenhum produto encontrado.
            </p>
          )}
        </div>

        <div>
          <Card className="space-y-3 sticky top-36">
            <h3 className="font-semibold flex items-center gap-2">
              <Popcorn className="w-4 h-4 text-accent-red-500" />
              Carrinho ({cartProducts.reduce((s, p) => s + p.quantity, 0)} itens)
            </h3>
            {cartProducts.length === 0 ? (
              <p className="text-sm text-foreground-muted">
                Adicione produtos ao carrinho
              </p>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {cartProducts.map((p) => (
                  <div key={p.productId} className="flex items-center gap-2 text-sm">
                    <span className="bg-accent-red-500/10 text-accent-red-400 px-2 py-0.5 rounded text-xs font-mono">
                      {p.quantity}x
                    </span>
                    <span className="flex-1 text-foreground-muted truncate">
                      {p.productName}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(p.unitPrice * p.quantity)}
                    </span>
                    <button
                      onClick={() => onRemoveProduct(p.productId)}
                      className="text-foreground-muted hover:text-accent-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {cartProducts.length > 0 && (
              <div className="pt-2 border-t border-border text-sm font-semibold flex justify-between">
                <span>Subtotal produtos</span>
                <span className="text-accent-red-500">
                  {formatCurrency(cartProducts.reduce((s, p) => s + p.unitPrice * p.quantity, 0))}
                </span>
              </div>
            )}
            <p className="text-xs text-foreground-muted">
              Pule esta etapa se nao deseja adicionar lanches.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PaymentStep({
  paymentMethods,
  selectedMethodId,
  onMethodChange,
  cashReceived,
  onCashReceivedChange,
  grandTotal,
  changeAmount,
  cartTickets,
  cartProducts,
  processing,
  onConfirm,
}: {
  paymentMethods: PosPaymentMethodItem[];
  selectedMethodId: string | null;
  onMethodChange: (id: string) => void;
  cashReceived: number;
  onCashReceivedChange: (v: number) => void;
  grandTotal: number;
  changeAmount: number;
  cartTickets: CartTicket[];
  cartProducts: CartProduct[];
  processing: boolean;
  onConfirm: () => void;
}) {
  const selectedPm = paymentMethods.find((m) => m.id === selectedMethodId);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h2 className="text-2xl font-display font-bold">Pagamento</h2>

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          <Card className="space-y-4">
            <h3 className="font-semibold text-lg">Metodo de Pagamento</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {paymentMethods.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => onMethodChange(m.id)}
                  className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] border transition-all duration-200 animate-fade-in-up ${
                    selectedMethodId === m.id
                      ? "border-accent-red-500 bg-accent-red-500/5 shadow-md shadow-accent-red-500/10"
                      : "border-border hover:border-accent-red-500/40"
                  }`}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <CreditCard className="w-5 h-5 text-foreground-muted" />
                  <span className="font-medium text-sm">{m.name}</span>
                </button>
              ))}
            </div>
          </Card>

          {selectedPm?.requires_change && (
            <Card className="space-y-3 animate-fade-in-up animate-fade-in-up-1">
              <h3 className="font-semibold text-lg">Valor Recebido</h3>
              <input
                type="number"
                min={0}
                step={0.01}
                className="w-full bg-background-strong border border-border rounded-[var(--radius-sm)] p-3 text-foreground text-lg font-mono"
                value={cashReceived || ""}
                onChange={(e) => onCashReceivedChange(Number(e.target.value))}
                placeholder="0,00"
              />
              {changeAmount > 0 && (
                <div className="bg-gold-100/10 border border-gold-300/30 rounded-[var(--radius-sm)] p-3 animate-fade-in-up">
                  <p className="text-gold-300 font-bold text-lg">
                    Troco: {formatCurrency(changeAmount)}
                  </p>
                </div>
              )}
              {cashReceived > 0 && cashReceived < grandTotal && (
                <p className="text-accent-red-400 text-sm">
                  Valor insuficiente. Faltam {formatCurrency(grandTotal - cashReceived)}.
                </p>
              )}
            </Card>
          )}
        </div>

        <Card className="space-y-4 sticky top-36 animate-fade-in-up animate-fade-in-up-2">
          <h3 className="font-semibold text-lg">Resumo</h3>
          <div className="space-y-2">
            {cartTickets.map((t) => (
              <div key={t.seatId} className="flex justify-between text-sm">
                <span className="text-foreground-muted">
                  {t.seatLabel} - {t.ticketTypeName}
                </span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(t.price)}
                </span>
              </div>
            ))}
            {cartProducts.map((p) => (
              <div key={p.productId} className="flex justify-between text-sm">
                <span className="text-foreground-muted">
                  {p.quantity}x {p.productName}
                </span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(p.unitPrice * p.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-accent-red-500">{formatCurrency(grandTotal)}</span>
            </div>
            {changeAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-foreground-muted">Troco</span>
                <span className="text-gold-300 font-medium">{formatCurrency(changeAmount)}</span>
              </div>
            )}
          </div>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={
              processing ||
              !selectedMethodId ||
              grandTotal <= 0 ||
              (selectedPm?.requires_change && cashReceived < grandTotal)
            }
            onClick={onConfirm}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Confirmar Venda
              </>
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function ConfirmationStep({
  saleId,
  saleReference,
  grandTotal,
  cartTickets,
  cartProducts,
  onNewSale,
}: {
  saleId: string | null;
  saleReference: string | null;
  grandTotal: number;
  cartTickets: CartTicket[];
  cartProducts: CartProduct[];
  onNewSale: () => void;
}) {
  const qrValue = saleReference || saleId || "";

  return (
    <div className="flex items-center justify-center min-h-[50vh] animate-fade-in-up">
      <Card className="max-w-lg w-full text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center animate-pulse-glow">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold">Venda Confirmada!</h2>
          {saleReference && (
            <p className="text-sm text-foreground-muted mt-1">
              Ref: {saleReference}
            </p>
          )}
        </div>

        {qrValue && (
          <div className="flex flex-col items-center gap-3 p-4 bg-background rounded-[var(--radius-lg)] border border-border/60">
            <div className="flex items-center gap-2 text-foreground-muted">
              <QrCode className="w-5 h-5" />
              <span className="text-sm font-medium">Ingresso Digital</span>
            </div>
            <QRCodeDisplay value={qrValue} size={180} />
            <p className="text-xs text-foreground-muted">
              Apresente este QR Code na entrada da sala
            </p>
          </div>
        )}

        <div className="space-y-2 text-sm text-left">
          {cartTickets.map((t) => (
            <div key={t.seatId} className="flex justify-between">
              <span className="text-foreground-muted">
                {t.seatLabel} - {t.ticketTypeName}
              </span>
              <span className="tabular-nums">{formatCurrency(t.price)}</span>
            </div>
          ))}
          {cartProducts.map((p) => (
            <div key={p.productId} className="flex justify-between">
              <span className="text-foreground-muted">
                {p.quantity}x {p.productName}
              </span>
              <span className="tabular-nums">
                {formatCurrency(p.unitPrice * p.quantity)}
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-border flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-accent-red-500">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
        <Button variant="primary" size="lg" className="w-full" onClick={onNewSale}>
          <Plus className="w-4 h-4" />
          Nova Venda
        </Button>
      </Card>
    </div>
  );
}
