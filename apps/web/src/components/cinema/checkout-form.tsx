"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ConcessionProduct, SessionGroup } from "@/types/storefront";
import { formatCurrency } from "@/lib/utils";
import { useBookingStore } from "@/stores/use-booking-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { RadioCard } from "@/components/ui/radio-card";
import { HoldCountdown } from "@/components/cinema/hold-countdown";
import { copy } from "@/lib/copy/catalog";

interface CheckoutActionState {
  error?: string;
}

type PaymentMethod = "pix" | "card" | "wallet";

export const CheckoutForm = ({
  session,
  concessions,
  action,
}: {
  session: SessionGroup;
  concessions: ConcessionProduct[];
  action: (state: CheckoutActionState, formData: FormData) => Promise<CheckoutActionState>;
}) => {
  const router = useRouter();
  const {
    selectedSeatIds,
    ticketQuantities,
    courtesyCode,
    productQuantities,
    setProductQuantity,
    holdExpiresAt,
    clearBooking,
  } = useBookingStore();
  const [state, formAction, pending] = useActionState(action, {});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [fiscalCpf, setFiscalCpf] = useState("");

  useEffect(() => {
    if (!selectedSeatIds.length) {
      router.replace(`/cidade/${session.citySlug}/sessao/${session.id}`);
    }
  }, [router, selectedSeatIds.length, session.citySlug, session.id]);

  const total = useMemo(() => {
    const seatTotal = selectedSeatIds.length * session.priceFrom;
    const productTotal = concessions.reduce((sum, product) => {
      return sum + (productQuantities[product.id] ?? 0) * product.price;
    }, 0);

    return seatTotal + productTotal;
  }, [concessions, productQuantities, selectedSeatIds.length, session.priceFrom]);

  const cardDigits = useMemo(() => cardNumber.replace(/\D/g, ""), [cardNumber]);
  const cardExpiryValid = useMemo(() => {
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      return false;
    }
    const [month] = cardExpiry.split("/");
    const monthNumber = Number(month);
    return monthNumber >= 1 && monthNumber <= 12;
  }, [cardExpiry]);
  const cardCvvDigits = useMemo(() => cardCvv.replace(/\D/g, ""), [cardCvv]);
  const isCardValid =
    cardDigits.length >= 13 &&
    cardDigits.length <= 19 &&
    cardExpiryValid &&
    cardCvvDigits.length >= 3 &&
    cardCvvDigits.length <= 4;
  const isSubmitBlocked =
    !selectedSeatIds.length || pending || (paymentMethod === "card" && !isCardValid);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1.1fr_0.8fr]">
      <input name="sessionId" type="hidden" value={session.id} />
      <input name="seatIds" type="hidden" value={JSON.stringify(selectedSeatIds)} />
      <input name="ticketQuantities" type="hidden" value={JSON.stringify(ticketQuantities)} />
      <input name="courtesyCode" type="hidden" value={courtesyCode} />
      <input name="productQuantities" type="hidden" value={JSON.stringify(productQuantities)} />
      <div className="space-y-6">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-accent-red-300">{copy("checkoutStepEyebrow")}</p>
              <h1 className="font-display text-4xl">{copy("checkoutStepTitle")}</h1>
            </div>
            <HoldCountdown expiresAt={holdExpiresAt} />
          </div>
          <Field>
            <FieldLabel htmlFor="checkout-customer-name">{copy("checkoutNameLabel")}</FieldLabel>
            <Input
              id="checkout-customer-name"
              required
              name="customerName"
              placeholder={copy("checkoutNamePlaceholder")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="checkout-customer-email">{copy("checkoutEmailLabel")}</FieldLabel>
            <Input
              id="checkout-customer-email"
              required
              name="customerEmail"
              type="email"
              placeholder={copy("checkoutEmailPlaceholder")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="checkout-fiscal-cpf">{copy("checkoutCpfLabel")}</FieldLabel>
            <Input
              id="checkout-fiscal-cpf"
              name="fiscalCpf"
              value={fiscalCpf}
              onChange={(event) => setFiscalCpf(event.target.value)}
              placeholder={copy("checkoutCpfPlaceholder")}
              inputMode="numeric"
            />
          </Field>
        </Card>
        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-accent-red-300">{copy("checkoutSnacksEyebrow")}</p>
            <h2 className="inline-flex items-center gap-2 font-display text-3xl">
              <Icon name="popcorn" size="md" className="text-accent-red-400" />
              {copy("checkoutSnacksTitle")}
            </h2>
          </div>
          <div className="space-y-3">
            {concessions.map((product) => {
              const quantity = productQuantities[product.id] ?? 0;

              return (
                <article
                  key={product.id}
                  className="grid items-center gap-3 rounded-[var(--radius-md)] border border-border p-4 sm:grid-cols-[88px_minmax(0,1fr)_auto]"
                >
                  <figure className="relative h-[72px] w-[72px] overflow-hidden rounded-[var(--radius-sm)] border border-border bg-background-strong sm:h-[88px] sm:w-[88px]">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 72px, 88px"
                        className="object-cover"
                      />
                    ) : (
                      <figcaption className="flex h-full w-full items-center justify-center bg-gradient-to-br from-background-strong to-surface text-foreground-muted">
                        <Icon name="popcorn" size="md" />
                      </figcaption>
                    )}
                  </figure>
                  <div className="min-w-0">
                    <p className="font-semibold">{product.name}</p>
                    <p className="mt-1 text-sm text-foreground-muted">{product.description}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{formatCurrency(product.price)}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-self-end">
                    <Button type="button" size="sm" variant="secondary" onClick={() => setProductQuantity(product.id, quantity - 1)}>
                      -
                    </Button>
                    <span className="min-w-6 text-center">{quantity}</span>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setProductQuantity(product.id, quantity + 1)}>
                      +
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs uppercase tracking-[0.24em] text-accent-red-300">{copy("checkoutPaymentEyebrow")}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { value: "pix" as const, label: copy("checkoutPaymentPix"), icon: "zap" as const },
                { value: "card" as const, label: copy("checkoutPaymentCard"), icon: "creditCard" as const },
                { value: "wallet" as const, label: copy("checkoutPaymentWallet"), icon: "smartphone" as const },
              ].map((method) => (
                <RadioCard
                  key={method.value}
                  name="paymentMethod"
                  value={method.value}
                  label={method.label}
                  icon={method.icon}
                  checked={paymentMethod === method.value}
                  onChange={() => setPaymentMethod(method.value)}
                />
              ))}
            </div>
            {paymentMethod === "card" ? (
              <div className="space-y-3 rounded-[var(--radius-md)] border border-border bg-background-strong/60 p-4">
                <p className="text-sm font-semibold text-foreground">{copy("checkoutCardDataTitle")}</p>
                <input name="stripePaymentMethodId" type="hidden" value="" />
                <input name="stripeClientSecret" type="hidden" value="" />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="checkout-card-number">{copy("checkoutCardNumber")}</FieldLabel>
                    <Input
                      id="checkout-card-number"
                      name="cardNumber"
                      value={cardNumber}
                      onChange={(event) => setCardNumber(event.target.value)}
                      placeholder="0000 0000 0000 0000"
                      autoComplete="cc-number"
                      inputMode="numeric"
                      required={paymentMethod === "card"}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="checkout-card-expiry">{copy("checkoutCardExpiry")}</FieldLabel>
                    <Input
                      id="checkout-card-expiry"
                      name="cardExpiry"
                      value={cardExpiry}
                      onChange={(event) => setCardExpiry(event.target.value)}
                      placeholder="MM/AA"
                      autoComplete="cc-exp"
                      inputMode="numeric"
                      required={paymentMethod === "card"}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="checkout-card-cvv">{copy("checkoutCardCvv")}</FieldLabel>
                    <Input
                      id="checkout-card-cvv"
                      name="cardCvv"
                      value={cardCvv}
                      onChange={(event) => setCardCvv(event.target.value)}
                      placeholder="123"
                      autoComplete="cc-csc"
                      inputMode="numeric"
                      required={paymentMethod === "card"}
                    />
                  </Field>
                </div>
                <p className="text-xs text-foreground-muted">
                  {copy("checkoutCardHelp")}
                </p>
              </div>
            ) : null}
            {paymentMethod === "pix" ? (
              <div className="rounded-[var(--radius-md)] border border-border bg-background-strong/60 p-4">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon name="zap" size="sm" className="text-accent-red-400" />
                  {copy("checkoutPixTitle")}
                </p>
                <p className="mt-1 text-xs text-foreground-muted">
                  {copy("checkoutPixDescription")}
                </p>
              </div>
            ) : null}
            {paymentMethod === "wallet" ? (
              <div className="rounded-[var(--radius-md)] border border-border bg-background-strong/60 p-4">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon name="smartphone" size="sm" className="text-accent-red-400" />
                  {copy("checkoutWalletTitle")}
                </p>
                <p className="mt-1 text-xs text-foreground-muted">
                  {copy("checkoutWalletDescription")}
                </p>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
      <Card className="space-y-5 self-start lg:sticky lg:top-24">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent-red-300">{copy("checkoutSummaryEyebrow")}</p>
          <h2 className="mt-2 font-display text-3xl">{copy("checkoutSummaryTitle")}</h2>
        </div>
        <div className="space-y-2 text-sm text-foreground-muted">
          <p>{session.date} • {session.time} • {session.room}</p>
          <p>{selectedSeatIds.length} ingresso(s) • Assentos {selectedSeatIds.join(", ")}</p>
          <p>Formato {session.format}</p>
        </div>
        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between text-sm">
            <span>{copy("checkoutTicketsLabel")}</span>
            <span>{formatCurrency(selectedSeatIds.length * session.priceFrom)}</span>
          </div>
          {concessions
            .filter((product) => (productQuantities[product.id] ?? 0) > 0)
            .map((product) => (
              <div key={product.id} className="flex items-center justify-between text-sm">
                <span>{product.name} x{productQuantities[product.id]}</span>
                <span>{formatCurrency((productQuantities[product.id] ?? 0) * product.price)}</span>
              </div>
            ))}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4 text-lg font-semibold">
          <span>{copy("checkoutTotalLabel")}</span>
          <span>{formatCurrency(total)}</span>
        </div>
        {state.error ? (
          <p className="inline-flex items-center gap-2 text-sm text-accent-red-300">
            <Icon name="error" size="sm" />
            {state.error}
          </p>
        ) : null}
        <Button className="w-full" disabled={isSubmitBlocked} size="lg" type="submit">
          {pending ? <Icon name="loader" size="sm" className="animate-spin" /> : <Icon name="ticket" size="sm" />}
          {pending ? copy("checkoutSubmitting") : copy("checkoutSubmit")}
        </Button>
        {paymentMethod === "card" && !isCardValid ? (
          <p className="text-xs text-foreground-muted">
            {copy("checkoutCardValidationHint")}
          </p>
        ) : null}
        <Button className="w-full" onClick={() => clearBooking()} size="sm" type="button" variant="ghost">
          <Icon name="x" size="sm" />
          {copy("checkoutClearSelection")}
        </Button>
      </Card>
    </form>
  );
};
