import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChipToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const ChipToggle = React.forwardRef<HTMLButtonElement, ChipToggleProps>(
  ({ className, active = false, type = "button", ...props }, ref) => (
    <Button
      ref={ref}
      type={type}
      variant={active ? "primary" : "chip"}
      size="sm"
      className={cn("h-9 rounded-[var(--radius-sm)] px-3 text-sm font-semibold normal-case tracking-normal", className)}
      aria-pressed={active}
      {...props}
    />
  ),
);

ChipToggle.displayName = "ChipToggle";
