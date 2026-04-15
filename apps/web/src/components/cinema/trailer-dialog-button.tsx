"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";

interface TrailerDialogButtonProps {
  trailerUrl: string;
  title: string;
  variant?: "primary" | "secondary";
  className?: string;
}

export const TrailerDialogButton = ({
  trailerUrl,
  title,
  variant = "secondary",
  className,
}: TrailerDialogButtonProps) => (
  <Dialog.Root>
    <Dialog.Trigger asChild>
      <Button className={className} size="lg" variant={variant}>
        <Icon name="play" size="md" />
        Assistir trailer
      </Button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
      <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
        <div className="w-full max-w-5xl overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background-elevated shadow-[0_24px_72px_rgba(0,0,0,0.42)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Dialog.Title className="text-sm font-semibold text-foreground">
              Trailer: {title}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Janela de trailer com reprodução em vídeo incorporado.
            </Dialog.Description>
            <Dialog.Close asChild>
              <IconButton aria-label="Fechar trailer" size="sm" variant="secondary">
                <Icon name="x" size="sm" />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="aspect-video bg-black">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
              loading="lazy"
              src={trailerUrl}
              title={`Trailer de ${title}`}
            />
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
