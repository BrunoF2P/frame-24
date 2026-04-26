"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { SessionGroup } from "@/types/storefront";
import { useBookingStore } from "@/stores/use-booking-store";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatCurrency } from "@/lib/utils";

export const SeatSelectionMobileStatus = ({
  session,
  tenantSlug,
}: {
  citySlug: string;
  session: SessionGroup;
  tenantSlug?: string;
}) => {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const {
    selectedSeatIds,
    ticketQuantities,
    courtesyCode,
    fiscalCpf,
    startHold,
  } = useBookingStore();

  const totalTickets = useMemo(
    () => Object.values(ticketQuantities).reduce((sum, quantity) => sum + (quantity ?? 0), 0),
    [ticketQuantities],
  );

  const validation = useMemo(
    () => {
      const errors: string[] = [];
      if (totalTickets === 0) errors.push("Escolha ao menos um ingresso.");
      if (selectedSeatIds.length !== totalTickets) {
        errors.push("Selecione um assento para cada ingresso.");
      }
      if (courtesyCode && courtesyCode.trim().length < 3) {
        errors.push("Código de cortesia inválido.");
      }
      if (fiscalCpf && fiscalCpf.replace(/\D/g, "").length !== 11) {
        errors.push("CPF inválido.");
      }
      return { isValid: errors.length === 0, errors, warnings: [] as string[] };
    },
    [courtesyCode, fiscalCpf, selectedSeatIds.length, totalTickets],
  );

  const subtotal = totalTickets * session.priceFrom;
  const messageTone = validation.errors.length ? "error" : validation.warnings.length ? "warning" : "success";
  const messageText = validation.errors.length
    ? validation.errors[0]
    : validation.warnings.length
      ? validation.warnings[0]
      : "Tudo pronto para continuar";

  return (
    <section className="lg:hidden">
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background-elevated/96 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_24px_rgba(0,0,0,0.1)] backdrop-blur landscape:pb-[calc(0.45rem+env(safe-area-inset-bottom))] landscape:pt-2">
        <div className="mx-auto flex w-full max-w-[var(--layout-max-width)] flex-col gap-2 landscape:flex-row landscape:items-center landscape:justify-between landscape:gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 landscape:min-w-0 landscape:flex-1">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Icon name="ticket" size="sm" />
              {selectedSeatIds.length}/{totalTickets} assentos
            </p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(subtotal)}</p>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={`${messageTone}-${messageText}`}
              className={
                messageTone === "error"
                  ? "inline-flex items-start gap-2 text-xs text-danger landscape:hidden"
                  : messageTone === "warning"
                    ? "inline-flex items-start gap-2 text-xs text-warning landscape:hidden"
                    : "inline-flex items-center gap-1 text-xs text-success landscape:hidden"
              }
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            >
              {messageTone === "error" ? (
                <Icon name="error" size="xs" className="mt-0.5" />
              ) : messageTone === "warning" ? (
                <Icon name="info" size="xs" className="mt-0.5" />
              ) : (
                <Icon name="sparkles" size="xs" />
              )}
              {messageText}
            </motion.p>
          </AnimatePresence>

          <Button
            className="w-full landscape:h-10 landscape:w-auto landscape:min-w-40 landscape:px-5"
            disabled={!validation.isValid}
            size="lg"
            type="button"
            onClick={() => {
              startHold(8);
              router.push(`${tenantSlug ? `/${tenantSlug}` : ""}/compra/${session.id}`);
            }}
          >
            Continuar
          </Button>
        </div>
      </div>
    </section>
  );
};
