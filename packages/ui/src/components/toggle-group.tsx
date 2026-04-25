import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../lib/cn";

export interface ToggleOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

export interface ToggleGroupProps {
  options: ToggleOption[];
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export function ToggleGroup({
  options,
  value,
  onChange,
  className,
  columns = 2,
}: ToggleGroupProps) {
  const toggle = (val: string) => {
    if (value.includes(val)) onChange(value.filter((v) => v !== val));
    else onChange([...value, val]);
  };

  const cols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  }[columns];

  return (
    <div className={cn("grid gap-3", cols, className)}>
      {options.map((opt) => {
        const selected = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            aria-pressed={selected}
            className={cn(
              "relative flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-200",
              selected
                ? "border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.05)]"
                : "border-[hsl(var(--color-border))] bg-white hover:border-[hsl(var(--color-primary)/0.4)]"
            )}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{opt.label}</p>
              {opt.description && (
                <p className="text-xs text-[hsl(var(--color-muted))]">
                  {opt.description}
                </p>
              )}
            </div>
            {selected && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--color-primary))] text-white shrink-0">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
