"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionGroup } from "@/types/storefront";
import { useBookingStore } from "@/stores/use-booking-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { HoldCountdown } from "@/components/cinema/hold-countdown";
import { formatCurrency } from "@/lib/utils";
import { copy } from "@/lib/copy/catalog";

export const SessionBookingPanel = ({
  session,
  citySlug,
  movieTitle,
  movieSlug,
  moviePosterUrl,
  cinemaName,
  cityState,
  tenantSlug,
}: {
  session: SessionGroup;
  citySlug: string;
  movieTitle: string;
  movieSlug: string;
  moviePosterUrl: string;
  cinemaName: string;
  cityState: string;
  tenantSlug?: string;
}) => {
  const router = useRouter();
  const {
    selectedSeatIds,
    holdExpiresAt,
    ticketQuantities,
    courtesyCode,
    fiscalCpf,
    setSession,
    startHold,
  } = useBookingStore();

  useEffect(() => {
    setSession(session.id);
  }, [session.id, setSession]);

  const totalTickets = useMemo(
    () => Object.values(ticketQuantities).reduce((sum, quantity) => sum + (quantity ?? 0), 0),
    [ticketQuantities],
  );
  const selectedSeatLabels = useMemo(
    () =>
      selectedSeatIds.map((seatId) => {
        const seat = session.seats.find((item) => item.id === seatId);
        return seat?.label || seatId;
      }),
    [selectedSeatIds, session.seats],
  );
  const validation = useMemo(
    () => {
      const errors: string[] = [];
      const totalTickets = Object.values(ticketQuantities).reduce(
        (sum, quantity) => sum + (quantity ?? 0),
        0,
      );
      if (totalTickets === 0) errors.push("Escolha ao menos um ingresso.");
      if (selectedSeatIds.length !== totalTickets) {
        errors.push("A quantidade de assentos deve bater com os ingressos.");
      }
      if (courtesyCode && courtesyCode.trim().length < 3) {
        errors.push("Informe um código de cortesia válido.");
      }
      if (fiscalCpf && fiscalCpf.replace(/\D/g, "").length !== 11) {
        errors.push("Informe um CPF válido.");
      }
      return { isValid: errors.length === 0, errors, warnings: [] as string[] };
    },
    [courtesyCode, fiscalCpf, selectedSeatIds.length, ticketQuantities],
  );
  const prefix = tenantSlug ? `/${tenantSlug}` : "";

  return (
    <Card className="space-y-5 self-start lg:sticky lg:top-24">
      <div className="flex justify-between gap-4 items-stretch">
        <div className="flex flex-col justify-between py-1">
          <div>
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.24em] text-accent-red-300 font-semibold">{copy("checkoutSummaryEyebrow")}</p>
            <h2 className="mt-2 font-display text-4xl sm:text-5xl">{session.time}</h2>
          </div>
          <div className="space-y-1.5 text-sm text-foreground-muted mt-4">
            <p className="font-semibold text-foreground">{movieTitle}</p>
            <p>{cinemaName}</p>
            <p>{session.format} • {session.language}</p>
          </div>
        </div>
        {moviePosterUrl && (
          <figure className="relative w-24 sm:w-28 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-border/60 shadow-sm aspect-[2/3] bg-background-strong">
            <img src={moviePosterUrl} alt={movieTitle} className="object-cover w-full h-full" />
          </figure>
        )}
      </div>
      <HoldCountdown expiresAt={holdExpiresAt} />
      <div className="rounded-[var(--radius-md)] border border-border p-4">
        <p className="text-sm text-foreground-muted">Ingressos</p>
        <p className="mt-2 text-lg font-semibold">{totalTickets}</p>
        <p className="mt-2 text-xs text-foreground-muted">UF ativa: {cityState}</p>
      </div>
      <div className="rounded-[var(--radius-md)] border border-border p-4">
        <p className="text-sm text-foreground-muted">Assentos selecionados</p>
        {selectedSeatLabels.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedSeatLabels.map((seatLabel) => (
              <span
                key={seatLabel}
                className="inline-flex min-w-12 items-center justify-center rounded-full border border-accent-red-500/20 bg-accent-red-500/8 px-3 py-1 text-sm font-semibold text-foreground"
              >
                {seatLabel}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-base font-medium text-foreground">{copy("movieDetailChooseOnMap")}</p>
        )}
        <p className="mt-3 text-xs text-foreground-muted">
          {selectedSeatLabels.length
            ? `${selectedSeatLabels.length} assento${selectedSeatLabels.length === 1 ? "" : "s"} reservado${selectedSeatLabels.length === 1 ? "" : "s"} para esta compra.`
            : "Os assentos escolhidos no mapa aparecem aqui."}
        </p>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>Subtotal</span>
        <span>{formatCurrency(totalTickets * session.priceFrom)}</span>
      </div>
      {validation.errors.length ? (
        <div className="space-y-1 rounded-[var(--radius-md)] border border-danger/35 bg-danger/8 p-3">
          {validation.errors.map((error) => (
            <p key={error} className="inline-flex items-start gap-2 text-xs text-danger">
              <Icon name="error" size="xs" className="mt-0.5" />
              {error}
            </p>
          ))}
        </div>
      ) : null}
      {validation.warnings.length ? (
        <div className="space-y-1 rounded-[var(--radius-md)] border border-warning/35 bg-warning/8 p-3">
          {validation.warnings.map((warning) => (
            <p key={warning} className="inline-flex items-start gap-2 text-xs text-warning">
              <Icon name="info" size="xs" className="mt-0.5" />
              {warning}
            </p>
          ))}
        </div>
      ) : null}
      <Button
        className="w-full"
        disabled={!validation.isValid}
        onClick={() => {
          startHold(8);
          router.push(`${prefix}/compra/${session.id}`);
        }}
        size="lg"
        type="button"
      >
        Continuar
      </Button>
      <Button asChild className="w-full" size="sm" variant="secondary">
        <Link href={`${prefix}/cidade/${citySlug}/filme/${movieSlug}`}>{copy("movieDetailSwitchSession")}</Link>
      </Button>
    </Card>
  );
};
