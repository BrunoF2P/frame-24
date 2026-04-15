import type { OccupancyLevel } from "@/types/storefront";
import { cn } from "@/lib/utils";

const tones: Record<OccupancyLevel, string> = {
  low: "bg-success",
  medium: "bg-warning",
  high: "bg-accent-red-500",
};

const labels: Record<OccupancyLevel, string> = {
  low: "Baixa ocupação",
  medium: "Ocupação média",
  high: "Últimos bons lugares",
};

export const OccupancyIndicator = ({ level }: { level: OccupancyLevel }) => (
  <div className="inline-flex items-center gap-2 text-xs text-foreground-muted">
    <span className={cn("h-2.5 w-2.5 rounded-full", tones[level])} />
    {labels[level]}
  </div>
);
