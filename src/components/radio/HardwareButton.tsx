import type { ButtonHTMLAttributes } from "react";
import { cn } from "../ui/cn";

export type HardwareButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "default" | "end";
  pressed?: boolean;
};

/** Top-lit console button: Mic, Speaker, and the red End call. */
export function HardwareButton({ tone = "default", pressed, className, children, type = "button", ...props }: HardwareButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={tone === "default" ? pressed : undefined}
      className={cn(
        "flex min-h-14 items-center justify-center gap-2 px-4 uppercase shadow-[var(--button-highlight)] transition-[filter]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:brightness-90",
        tone === "end"
          ? "text-xl font-bold [background:var(--end-call-gradient)]"
          : "text-sm text-foreground/85 [background:var(--button-gradient)]",
        pressed && "brightness-125",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
