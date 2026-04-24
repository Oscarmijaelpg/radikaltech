import * as React from "react";
import { cn } from "../lib/cn";

type Size = "xs" | "sm";

const SIZE_CLASSES: Record<Size, string> = {
  xs: "text-[10px]",
  sm: "text-[11px]",
};

type SectionTitleProps<T extends React.ElementType = "p"> = {
  as?: T;
  size?: Size;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "size" | "className" | "children">;

export function SectionTitle<T extends React.ElementType = "p">({
  className,
  size = "xs",
  as,
  ...props
}: SectionTitleProps<T>) {
  const Tag = (as ?? "p") as React.ElementType;
  return (
    <Tag
      className={cn(
        "font-black uppercase tracking-widest text-[hsl(var(--color-muted))]",
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}
