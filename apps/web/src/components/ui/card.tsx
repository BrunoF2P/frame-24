import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "glass-panel rounded-[var(--radius-lg)] border border-border/90 p-5 text-foreground",
      className,
    )}
    {...props}
  />
);
