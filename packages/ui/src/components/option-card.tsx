import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../lib/cn";

export interface OptionCardProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  selected?: boolean;
}

export const OptionCard = React.forwardRef<HTMLButtonElement, OptionCardProps>(
  ({ icon, title, description, selected, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-col items-start gap-4 rounded-3xl border-2 p-6 text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-primary))] focus-visible:ring-offset-2",
        selected
          ? "border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.04)] shadow-lg shadow-[hsl(var(--color-primary)/0.15)]"
          : "border-[hsl(var(--color-border))] bg-white hover:border-[hsl(var(--color-primary)/0.5)] hover:-translate-y-0.5 hover:shadow-xl",
        className
      )}
      {...props}
    >
      {icon && (
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl transition-colors",
            selected
              ? "bg-[hsl(var(--color-primary))] text-white"
              : "bg-slate-100 text-[hsl(var(--color-foreground))] group-hover:bg-[hsl(var(--color-primary)/0.1)] group-hover:text-[hsl(var(--color-primary))]"
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        {description && (
          <p className="text-sm text-[hsl(var(--color-muted))] mt-1">
            {description}
          </p>
        )}
      </div>
      {selected && (
        <span className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--color-primary))] text-white">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
    </button>
  )
);
OptionCard.displayName = "OptionCard";
