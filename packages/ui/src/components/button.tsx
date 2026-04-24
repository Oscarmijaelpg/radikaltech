import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-primary))] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-[hsl(var(--color-primary))] text-white hover:bg-[hsl(var(--color-primary-hover))] shadow-lg shadow-[hsl(var(--color-primary)/0.25)]",
        secondary:
          "bg-[hsl(var(--color-secondary))] text-white hover:bg-[hsl(var(--color-secondary-hover))] shadow-lg shadow-[hsl(var(--color-secondary)/0.25)]",
        outline:
          "border-2 border-[hsl(var(--color-border))] bg-transparent text-[hsl(var(--color-foreground))] hover:bg-[hsl(var(--color-border)/0.3)]",
        ghost:
          "bg-transparent text-[hsl(var(--color-foreground))] hover:bg-[hsl(var(--color-border)/0.5)]",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25",
        link: "bg-transparent text-[hsl(var(--color-primary))] hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-base",
        lg: "h-14 px-8 text-lg",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
