import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        primary:
          "bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))]",
        secondary:
          "bg-[hsl(var(--color-secondary)/0.1)] text-[hsl(var(--color-secondary))]",
        outline:
          "border border-[hsl(var(--color-border))] text-[hsl(var(--color-foreground))]",
        success: "bg-green-100 text-green-700",
        warning: "bg-amber-100 text-amber-700",
        destructive: "bg-red-100 text-red-700",
        muted: "bg-slate-100 text-[hsl(var(--color-muted))]",
      },
    },
    defaultVariants: { variant: "primary" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
