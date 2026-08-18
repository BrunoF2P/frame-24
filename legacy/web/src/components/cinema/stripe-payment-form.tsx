"use client";

import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export function StripePaymentForm({
  tenantSlug,
  checkoutId,
  clientSecret,
}: {
  tenantSlug: string;
  checkoutId: string;
  clientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/${tenantSlug}/pagamento/${checkoutId}`,
      },
      redirect: "if_required",
    });

    if (submitError) {
      setError(submitError.message ?? "Erro ao processar pagamento.");
      setLoading(false);
      return;
    }

    setSucceeded(true);
    setLoading(false);
  };

  if (succeeded) {
    return (
      <Card className="flex min-h-[12rem] items-center justify-center">
        <div className="space-y-3 text-center">
          <Icon name="ticket" size="lg" className="text-accent-red-400" />
          <p className="text-lg font-semibold text-foreground">Pagamento confirmado!</p>
          <p className="text-sm text-foreground-muted">Redirecionando para seu pedido...</p>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error ? (
        <p className="inline-flex items-center gap-2 text-sm text-accent-red-300">
          <Icon name="error" size="sm" />
          {error}
        </p>
      ) : null}
      <Button
        className="w-full"
        disabled={!stripe || !elements || loading}
        size="lg"
        type="submit"
      >
        {loading ? (
          <Icon name="loader" size="sm" className="animate-spin" />
        ) : (
          <Icon name="creditCard" size="sm" />
        )}
        {loading ? "Processando..." : "Pagar com cartão"}
      </Button>
    </form>
  );
}
