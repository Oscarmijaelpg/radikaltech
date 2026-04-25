import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../lib/cn";

export type StepState = "current" | "completed" | "pending";

export interface Step {
  label: string;
  description?: string;
}

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Step[];
  currentStep: number;
  orientation?: "horizontal" | "vertical";
}

export function Stepper({
  steps,
  currentStep,
  orientation = "horizontal",
  className,
  ...props
}: StepperProps) {
  return (
    <div
      className={cn(
        "flex",
        orientation === "horizontal" ? "flex-row items-center" : "flex-col",
        className
      )}
      {...props}
    >
      {steps.map((step, idx) => {
        const state: StepState =
          idx < currentStep
            ? "completed"
            : idx === currentStep
            ? "current"
            : "pending";
        const isLast = idx === steps.length - 1;
        return (
          <React.Fragment key={idx}>
            <div
              className={cn(
                "flex items-center gap-3",
                orientation === "vertical" && "w-full"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-sm transition-all duration-200",
                  state === "completed" &&
                    "bg-[hsl(var(--color-primary))] text-white",
                  state === "current" &&
                    "bg-[hsl(var(--color-primary))] text-white ring-4 ring-[hsl(var(--color-primary)/0.2)]",
                  state === "pending" &&
                    "bg-slate-100 text-[hsl(var(--color-muted))]"
                )}
              >
                {state === "completed" ? (
                  <Check className="h-5 w-5" strokeWidth={3} />
                ) : (
                  idx + 1
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    state === "pending"
                      ? "text-[hsl(var(--color-muted))]"
                      : "text-[hsl(var(--color-foreground))]"
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-xs text-[hsl(var(--color-muted))]">
                    {step.description}
                  </span>
                )}
              </div>
            </div>
            {!isLast && (
              <div
                className={cn(
                  orientation === "horizontal"
                    ? "flex-1 h-0.5 mx-4"
                    : "w-0.5 h-8 ml-5 my-2",
                  state === "completed"
                    ? "bg-[hsl(var(--color-primary))]"
                    : "bg-[hsl(var(--color-border))]"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
