import * as React from "react";
import { cn } from "../lib/cn";
import { Label } from "./label";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  suggested?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, label, error, helperText, containerClassName, id, suggested, ...props },
    ref
  ) => {
    const textareaId = id ?? React.useId();
    return (
      <div className={cn("flex flex-col gap-2", containerClassName)}>
        {label && <Label htmlFor={textareaId}>{label}</Label>}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            "w-full min-h-[120px] rounded-2xl bg-slate-100 px-5 py-4 text-base text-[hsl(var(--color-foreground))] placeholder:text-[hsl(var(--color-muted))] transition-all duration-200 resize-y",
            "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))] focus:bg-white",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "ring-2 ring-red-500 bg-red-50",
            suggested && !error && "ring-1 ring-[hsl(var(--color-primary)/0.4)] bg-[hsl(var(--color-primary)/0.04)]",
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
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
Textarea.displayName = "Textarea";
