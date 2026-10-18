"use client";

import type { ButtonHTMLAttributes, PointerEvent } from "react";
import { useState } from "react";
import { cn } from "../ui/cn";

export type HardwareButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "default" | "end";
  /** Latched down, for toggles like Mic and Speaker. Leave undefined for momentary buttons. */
  pressed?: boolean;
};

/**
 * Top-lit console button: Mic, Speaker, and the red End call.
 * Up: lit from the top left with a raised gradient. Held or latched down: the light goes,
 * the gradient flips, the face sinks 1px and the label dims, like a physical key.
 */
export function HardwareButton({
  tone = "default",
  pressed,
  className,
  children,
  type = "button",
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  ...props
}: HardwareButtonProps) {
  const [held, setHeld] = useState(false);
  const down = held || pressed === true;
  const release = (handler?: (e: PointerEvent<HTMLButtonElement>) => void) => (e: PointerEvent<HTMLButtonElement>) => {
    setHeld(false);
    handler?.(e);
  };

  return (
    <button
      type={type}
      aria-pressed={pressed}
      data-down={down || undefined}
      {...(pressed === undefined ? { "data-cuelume-tap": "" } : { "data-cuelume-toggle": "" })}
      onPointerDown={(e) => {
        setHeld(true);
        onPointerDown?.(e);
      }}
      onPointerUp={release(onPointerUp)}
      onPointerLeave={release(onPointerLeave)}
      onPointerCancel={release(onPointerCancel)}
      className={cn(
        "group relative flex h-[70px] touch-manipulation select-none items-center justify-center overflow-hidden transition-[box-shadow,filter] duration-75",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:pointer-events-none disabled:opacity-50",
        tone === "end"
          ? down
            ? "[background:var(--end-call-gradient-pressed)] shadow-[var(--button-pressed-shadow)]"
            : "[background:var(--end-call-gradient)] shadow-[var(--button-highlight)] hover:brightness-110"
          : down
            ? "[background:var(--button-gradient-pressed)] shadow-[var(--button-pressed-shadow)]"
            : "[background:var(--button-gradient)] shadow-[var(--button-highlight)] hover:brightness-110",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "flex items-center gap-3 transition-[transform,opacity] duration-75",
          down ? "translate-y-px opacity-60" : "opacity-100",
        )}
      >
        {children}
      </span>
    </button>
  );
}
