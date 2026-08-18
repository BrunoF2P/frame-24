"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Ticket, X } from "lucide-react";
import { DialogShell } from "@/components/ui/dialog-shell";
import { IconButton } from "@/components/ui/icon-button";

export function CinemaPricingInfo({ cinemaName }: { cinemaName: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface hover:bg-surface-elevated text-foreground-muted hover:text-foreground transition-colors border border-border/50"
          title="Ver preços dos ingressos"
          aria-label="Ver preços dos ingressos"
        >
          <Ticket className="h-4 w-4" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] p-4 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <DialogShell className="rounded-[var(--radius-lg)] border border-border bg-background p-6 shadow-xl relative min-h-0 w-full">
            <div className="flex items-start justify-between">
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-accent-red-500" />
                  Preços dos Ingressos
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-foreground-muted">
                  Valores base para <strong className="text-foreground">{cinemaName}</strong>.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <IconButton aria-label="Fechar" variant="secondary" size="sm">
                  <X className="h-4 w-4" />
                </IconButton>
              </Dialog.Close>
            </div>
            
            <div className="mt-6 space-y-3">
              <div className="rounded-[var(--radius-sm)] border border-border/70 p-3 bg-surface/50 flex justify-between items-center transition-colors hover:border-border">
                <span className="font-medium text-foreground">Inteira</span>
                <span className="font-semibold text-foreground">R$ 48,00</span>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-accent-red-500/30 p-3 bg-accent-red-500/5 flex justify-between items-center relative overflow-hidden transition-colors hover:border-accent-red-500/50">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent-red-500"></div>
                <div className="pl-3">
                  <span className="font-medium text-foreground">Meia-entrada</span>
                  <p className="text-[11px] text-foreground-muted mt-0.5">Estudantes e PCD</p>
                </div>
                <span className="font-semibold text-accent-red-500">R$ 24,00</span>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-border/70 p-3 bg-surface/50 flex justify-between items-center transition-colors hover:border-border">
                <div className="flex items-center gap-2">
                   <span className="font-medium text-foreground">Promoção Cliente Prime</span>
                   <span className="inline-flex rounded-full bg-accent-red-500/20 px-2 py-0.5 text-[10px] uppercase font-bold text-accent-red-500">Destaque</span>
                </div>
                <span className="font-semibold text-accent-red-500">R$ 24,00</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-border/40 text-xs text-foreground-muted leading-relaxed">
              * Preços válidos para sessões 2D convencionais. Sessões 3D, VIP, ou IMAX possuem acréscimos aplicados no momento da escolha do assento.
            </div>
          </DialogShell>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
