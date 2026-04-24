import * as React from "react";
import { cn } from "../lib/cn";

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  /** Opcional: tamaño en pixels aplicado como inline style (gana sobre className). */
  size?: number;
}

export const Icon = React.forwardRef<HTMLSpanElement, IconProps>(
  ({ name, size, className, style, ...props }, ref) => (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn("material-symbols-outlined", className)}
      style={size !== undefined ? { ...style, fontSize: `${size}px` } : style}
      {...props}
    >
      {name}
    </span>
  ),
);
Icon.displayName = "Icon";
