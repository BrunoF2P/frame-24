import * as React from "react";
import { cn } from "@/lib/utils";
import type { IconName } from "@/lib/icon-registry";
import { Icon } from "@/components/ui/icon";

interface RadioCardProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  icon?: IconName;
}

export const RadioCard = React.forwardRef<HTMLInputElement, RadioCardProps>(
  ({ id, label, description, icon, className, ...props }, ref) => {
    const inputId = id ?? `radio-${label.toLowerCase().replace(/\s+/g, "-")}`;

    return (
      <label
        htmlFor={inputId}
        className="group relative flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-4 hover:bg-background-strong"
      >
        <input
          ref={ref}
          id={inputId}
          type="radio"
          className={cn(
            "mt-0.5 h-4 w-4 border-border text-accent-red-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-red-500/35",
            className,
          )}
          {...props}
        />
        <span className="space-y-0.5">
          <span className="inline-flex items-center gap-2">
            {icon ? <Icon name={icon} size="sm" className="text-foreground-muted" /> : null}
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </span>
          {description ? <span className="block text-xs text-foreground-muted">{description}</span> : null}
        </span>
      </label>
    );
  },
);

RadioCard.displayName = "RadioCard";
