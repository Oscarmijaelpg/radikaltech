import * as React from "react";
import { cn } from "../lib/cn";
import { Label } from "./label";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  icon?: string;
  suggested?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, helperText, containerClassName, id, icon, suggested, ...props },
    ref
  ) => {
    const inputId = id ?? React.useId();
    return (
      <div className={cn("flex flex-col gap-2", containerClassName)}>
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <div className="relative">
          {icon && (
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">
              {icon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "w-full rounded-2xl bg-slate-100 py-4 text-base text-[hsl(var(--color-foreground))] placeholder:text-[hsl(var(--color-muted))] transition-all duration-200",
              icon ? "pl-12 pr-5" : "px-5",
              "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))] focus:bg-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error && "ring-2 ring-red-500 bg-red-50",
              suggested && !error && "ring-1 ring-[hsl(var(--color-primary)/0.4)] bg-[hsl(var(--color-primary)/0.04)]",
              className
            )}
            aria-invalid={!!error}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs text-red-500 font-medium">{error}</p>
        ) : suggested ? (
          <p className="text-xs font-semibold text-[hsl(var(--color-primary))] flex items-center gap-1">
            <span aria-hidden>✨</span>
            <span>Sugerido por IA — revísalo y edítalo si hace falta</span>
          </p>
        ) : helperText ? (
          <p className="text-xs text-[hsl(var(--color-muted))]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
