import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";

export const DialogShell = ({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "relative min-h-full w-full bg-background md:min-h-0 md:max-w-5xl md:overflow-hidden md:rounded-[var(--radius-lg)] md:border md:border-border md:bg-background-elevated md:shadow-[0_30px_90px_rgba(0,0,0,0.35)]",
      className,
    )}
  >
    {children}
  </div>
);

export const DialogShellHeader = ({
  className,
  title,
  description,
  onCloseLabel = "Fechar",
}: {
  className?: string;
  title: string;
  description: string;
  onCloseLabel?: string;
}) => (
  <header className={cn("mb-5 flex items-center justify-between gap-4", className)}>
    <div>
      <Dialog.Title className="text-2xl font-semibold text-foreground">{title}</Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-foreground-muted">
        {description}
      </Dialog.Description>
    </div>
    <Dialog.Close asChild>
      <IconButton aria-label={onCloseLabel} variant="secondary" size="sm">
        <Icon name="x" size="md" />
      </IconButton>
    </Dialog.Close>
  </header>
);
