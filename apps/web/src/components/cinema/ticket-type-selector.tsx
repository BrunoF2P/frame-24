"use client";

import type { TicketType } from "@/types/storefront";
import { useBookingStore } from "@/stores/use-booking-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";

const iconByTicketType: Partial<Record<TicketType["code"], "ticket" | "user" | "zap" | "sparkles" | "creditCard">> = {
  inteira: "ticket",
  meia_estudante: "user",
  meia_idoso: "user",
  meia_pcd: "user",
  meia_jovem_baixa_renda: "user",
  crianca: "user",
  senior: "user",
  cortesia_codigo: "zap",
  promocional_parceiro: "creditCard",
  acompanhante_pcd: "user",
};

export const TicketTypeSelector = ({ ticketTypes }: { ticketTypes: TicketType[] }) => {
  const { ticketQuantities, setTicketQuantity, courtesyCode, setCourtesyCode, fiscalCpf, setFiscalCpf } =
    useBookingStore();

  const hasCourtesyType = (ticketQuantities.cortesia_codigo ?? 0) > 0;
  const hasYouthHalfType = (ticketQuantities.meia_jovem_baixa_renda ?? 0) > 0;

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-accent-red-300">Tipos de ingresso</p>
        <h2 className="mt-2 font-display text-3xl">Defina categorias antes do mapa</h2>
      </div>

      <div className="space-y-3">
        {ticketTypes.map((ticketType) => {
          const quantity = ticketQuantities[ticketType.code] ?? 0;

          return (
            <article
              key={ticketType.code}
              className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border p-4"
            >
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon name={iconByTicketType[ticketType.code] ?? "ticket"} size="sm" />
                  {ticketType.label}
                </p>
                <p className="mt-1 text-xs text-foreground-muted">{ticketType.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => setTicketQuantity(ticketType.code, quantity - 1)}>
                  -
                </Button>
                <span className="min-w-6 text-center text-sm font-semibold">{quantity}</span>
                <Button type="button" size="sm" variant="secondary" onClick={() => setTicketQuantity(ticketType.code, quantity + 1)}>
                  +
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {hasCourtesyType ? (
        <Field>
          <FieldLabel htmlFor="ticket-courtesy-code">Código de cortesia</FieldLabel>
          <Input
            id="ticket-courtesy-code"
            value={courtesyCode}
            onChange={(event) => setCourtesyCode(event.target.value)}
            placeholder="Digite o código da cortesia"
          />
        </Field>
      ) : null}

      {hasYouthHalfType ? (
        <Field>
          <FieldLabel htmlFor="ticket-fiscal-cpf">CPF (exigido conforme regra local)</FieldLabel>
          <Input
            id="ticket-fiscal-cpf"
            value={fiscalCpf}
            onChange={(event) => setFiscalCpf(event.target.value)}
            placeholder="000.000.000-00"
            inputMode="numeric"
          />
        </Field>
      ) : null}
    </Card>
  );
};
