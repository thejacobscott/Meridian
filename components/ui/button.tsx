import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "quiet";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-soft hover:brightness-[1.05] active:brightness-100",
  secondary: "bg-ink text-paper hover:opacity-90",
  ghost: "border border-line bg-surface/70 text-ink hover:bg-ink/[0.04]",
  quiet: "text-ink-soft hover:text-ink hover:bg-ink/[0.04]",
};

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-12 px-7 text-base",
};

/** Class string for the editorial button — also usable on <Link>. */
export function buttonVariants({
  variant = "primary",
  size = "md",
}: { variant?: Variant; size?: Size } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none",
    "transition-[transform,filter,background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
    "active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
    variantClass[variant],
    sizeClass[size],
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
