import * as React from "react";
import { cn } from "../lib/cn";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-4 py-12 px-6",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="h-16 w-16 rounded-full bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center text-[hsl(var(--color-primary))]">
          {icon}
        </div>
      )}
      <div className="max-w-sm">
        <h3 className="font-display text-xl font-bold">{title}</h3>
        {description && (
          <p className="text-sm text-[hsl(var(--color-muted))] mt-1">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
