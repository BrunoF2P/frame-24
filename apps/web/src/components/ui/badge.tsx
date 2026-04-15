import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--radius-sm)] border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
  {
    variants: {
      variant: {
        neutral: "border-border bg-surface text-foreground-muted",
        accent: "border-accent-red-500/30 bg-accent-red-500/10 text-accent-red-300",
        gold: "border-gold-500/30 bg-gold-300/12 text-gold-300",
        success: "border-success/30 bg-success/10 text-green-300",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  className?: string;
}

export const Badge = ({ children, className, variant }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)}>{children}</span>
);
