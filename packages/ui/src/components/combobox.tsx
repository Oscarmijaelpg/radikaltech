import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "../lib/cn";

export interface ComboboxOption {
  label: string;
  value: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  allowCustom?: boolean;
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Selecciona una opción",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Sin resultados",
  allowCustom = false,
  className,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? (value && allowCustom ? value : "");

  const filtered = React.useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const handleSelect = (val: string) => {
    onChange?.(val);
    setOpen(false);
    setQuery("");
  };

  const handleCustom = () => {
    if (allowCustom && query.trim()) {
      onChange?.(query.trim());
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-12 w-full items-center justify-between rounded-2xl bg-slate-100 px-5 py-3 text-base transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))] focus:bg-white",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
        >
          <span
            className={cn(
              "truncate text-left",
              !displayLabel && "text-[hsl(var(--color-muted))]"
            )}
          >
            {displayLabel || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-2xl bg-white shadow-2xl border border-[hsl(var(--color-border))] overflow-hidden"
        >
          <div className="flex items-center gap-2 border-b border-[hsl(var(--color-border))] px-4 py-3">
            <Search className="h-4 w-4 opacity-50" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && allowCustom && filtered.length === 0) {
                  e.preventDefault();
                  handleCustom();
                }
              }}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent outline-none text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
            {filtered.length === 0 ? (
              <div className="py-6 px-3 text-center text-sm text-[hsl(var(--color-muted))]">
                {emptyMessage}
                {allowCustom && query.trim() && (
                  <button
                    type="button"
                    onClick={handleCustom}
                    className="mt-2 block w-full rounded-xl bg-[hsl(var(--color-primary)/0.1)] px-3 py-2 text-sm font-medium text-[hsl(var(--color-primary))] hover:bg-[hsl(var(--color-primary)/0.15)]"
                  >
                    Usar "{query.trim()}"
                  </button>
                )}
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-left transition-colors",
                    "hover:bg-slate-100",
                    value === opt.value &&
                      "bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))]"
                  )}
                >
                  <span>{opt.label}</span>
                  {value === opt.value && <Check className="h-4 w-4" />}
                </button>
              ))
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
