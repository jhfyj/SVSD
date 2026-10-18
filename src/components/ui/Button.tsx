import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "danger";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** The small square dot that leads the primary button in the designs. */
  dot?: boolean;
  fullWidth?: boolean;
};

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover",
  secondary: "border border-border text-foreground hover:bg-surface",
  danger: "border border-danger text-danger hover:bg-danger/10",
};

export function Button({
  variant = "primary",
  dot = variant === "primary",
  fullWidth,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      data-cuelume-tap={variant === "primary" ? "" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-token px-4 py-3 text-sm uppercase transition-colors duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden className="size-1.5 bg-current" />}
      {children}
    </button>
  );
}
