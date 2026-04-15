import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold tracking-[0.01em] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-accent-red-500 text-white shadow-[0_10px_24px_rgba(229,57,53,0.22)] hover:bg-accent-red-600",
        secondary:
          "border border-border bg-surface text-foreground hover:bg-background-strong",
        ghost: "text-foreground hover:bg-background-strong",
        gold: "bg-gold-300 text-stone-950 hover:bg-gold-100",
        quiet: "text-foreground-muted hover:bg-background-strong hover:text-foreground",
        chip: "border border-border bg-surface text-foreground-muted hover:bg-background-strong",
      },
      size: {
        sm: "h-9 px-3.5",
        md: "h-11 px-4.5",
        lg: "h-12 px-5 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
