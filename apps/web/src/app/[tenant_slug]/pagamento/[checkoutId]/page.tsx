"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { customerApi } from "@/lib/api-client";
import { formatCurrency, formatDateTimeInTimeZone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

type PaymentData = {
  pix_qr_code?: string;
  pix_copy_paste?: string;
};

type PaymentAttempt = {
  id?: string;
  status?: string;
  amount?: string;
  provider_reference?: string;
  public_reference?: string | null;
  sale_id?: string | null;
  error_message?: string | null;
  expires_at?: string | null;
  payment_data?: PaymentData | null;
};

type CheckoutSession = {
  id: string;
  status?: string;
  showtime_id?: string;
  reservation_uuid?: string;
  total_amount?: string;
  expires_at?: string;
  public_reference?: string | null;
  sale_id?: string | null;
  payment?: PaymentAttempt | null;
};

type PaymentStatusResponse = {
  checkout_status?: string;
  public_reference?: string | null;
  sale_id?: string | null;
  payment?: PaymentAttempt | null;
};

const paidStatuses = new Set(["paid", "approved", "confirmed"]);
const failedStatuses = new Set(["failed", "expired", "canceled", "cancelled", "declined"]);

export default function TenantPaymentStatusPage({
  params,
}: {
  params: Promise<{ tenant_slug: string; checkoutId: string }>;
}) {
  const { tenant_slug, checkoutId } = use(params);
  const router = useRouter();
  const [checkout, setCheckout] = useState<CheckoutSession | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const payment = paymentStatus?.payment ?? checkout?.payment ?? null;
  const status = (payment?.status ?? paymentStatus?.checkout_status ?? checkout?.status ?? "pending").toLowerCase();
  const reference = paymentStatus?.public_reference ?? payment?.public_reference ?? checkout?.public_reference ?? payment?.sale_id ?? checkout?.sale_id;
  const pixPayload = payment?.payment_data?.pix_copy_paste ?? payment?.payment_data?.pix_qr_code ?? null;

  const expiresAt = useMemo(() => {
    const raw = payment?.expires_at ?? checkout?.expires_at;
    return raw ? new Date(raw) : null;
  }, [checkout?.expires_at, payment?.expires_at]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [checkoutResponse, statusResponse] = await Promise.all([
          customerApi.customerCheckoutFindOneV1(tenant_slug, checkoutId),
          customerApi.customerCheckoutPaymentStatusV1(tenant_slug, checkoutId),
        ]);

        if (cancelled) {
          return;
        }

        setCheckout(checkoutResponse.data as unknown as CheckoutSession);
        setPaymentStatus(statusResponse.data as unknown as PaymentStatusResponse);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Não foi possível recuperar este pagamento.");
        }
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
  }, [checkoutId, tenant_slug]);

  useEffect(() => {
    if (paidStatuses.has(status) && reference) {
      localStorage.removeItem(`seat-reservation-${checkout?.showtime_id}`);
      router.replace(`/${tenant_slug}/pedido/${reference}`);
    }
  }, [checkout?.showtime_id, reference, router, status, tenant_slug]);

  useEffect(() => {
    if (paidStatuses.has(status) || failedStatuses.has(status)) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const response = await customerApi.customerCheckoutPaymentStatusV1(tenant_slug, checkoutId);
        setPaymentStatus(response.data as unknown as PaymentStatusResponse);
      } catch {
        setError("Ainda não consegui atualizar o status. Tentando novamente...");
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [checkoutId, status, tenant_slug]);

  if (loading) {
    return (
      <main className="page-shell py-10">
        <Card className="flex min-h-[18rem] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent-red-500" />
        </Card>
      </main>
    );
  }

  if (error && !checkout) {
    return (
      <main className="page-shell py-10">
        <Card className="space-y-4">
          <h1 className="text-2xl font-semibold">Pagamento indisponível</h1>
          <p className="text-sm text-foreground-muted">{error}</p>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/${tenant_slug}`}>Voltar ao início</Link>
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="page-shell space-y-5 py-8 md:py-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-accent-red-300">Pagamento</p>
        <h1 className="font-display text-4xl text-foreground">
          {paidStatuses.has(status) ? "Pagamento aprovado" : failedStatuses.has(status) ? "Pagamento não concluído" : "Aguardando pagamento"}
        </h1>
        <p className="max-w-2xl text-sm text-foreground-muted">
          Seu pedido só será confirmado quando a API marcar a tentativa de pagamento como aprovada.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-background">
              <Icon name={failedStatuses.has(status) ? "info" : paidStatuses.has(status) ? "ticket" : "timer"} size="md" />
            </span>
            <div>
              <p className="text-sm text-foreground-muted">Status atual</p>
              <p className="text-xl font-semibold capitalize">{status.replaceAll("_", " ")}</p>
            </div>
          </div>

          {pixPayload ? (
            <div className="space-y-3 rounded-[var(--radius-md)] border border-border bg-background p-4">
              <p className="text-sm font-semibold">Pix copia e cola</p>
              <p className="break-all font-mono text-sm text-foreground-muted">{pixPayload}</p>
              <Button
                size="sm"
                type="button"
                variant="secondary"
                onClick={() => navigator.clipboard?.writeText(pixPayload)}
              >
                <Icon name="download" size="sm" />
                Copiar código Pix
              </Button>
            </div>
          ) : null}

          {payment?.error_message ? (
            <p className="text-sm text-foreground-muted">{payment.error_message}</p>
          ) : null}

          {error ? <p className="text-sm text-foreground-muted">{error}</p> : null}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-xl font-semibold">Resumo</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-foreground-muted">Pagamento</dt>
              <dd className="font-mono">{checkoutId.slice(0, 12)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-foreground-muted">Total</dt>
              <dd className="font-semibold">{formatCurrency(Number(checkout?.total_amount ?? payment?.amount ?? 0))}</dd>
            </div>
            {expiresAt ? (
              <div className="flex justify-between gap-3">
                <dt className="text-foreground-muted">Expira em</dt>
                <dd>{formatDateTimeInTimeZone(expiresAt)}</dd>
              </div>
            ) : null}
          </dl>
          {failedStatuses.has(status) ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/${tenant_slug}`}>
                Escolher assentos novamente
              </Link>
            </Button>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
