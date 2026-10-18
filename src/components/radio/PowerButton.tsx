"use client";

import { Power } from "@carbon/icons-react";
import { useState } from "react";
import { cn } from "../ui/cn";

/** Red power key in the top bar. The glow dims while it's held, like a lit switch being pushed in. */
export function PowerButton({ onClick, className }: { onClick?: () => void; className?: string }) {
  const [held, setHeld] = useState(false);
  return (
    <button
      type="button"
      aria-label="Power"
      onClick={onClick}
      data-cuelume-tap=""
      data-cuelume-emphasis="strong"
      onPointerDown={() => setHeld(true)}
      onPointerUp={() => setHeld(false)}
      onPointerLeave={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
      className={cn(
        "flex size-11 touch-manipulation items-center justify-center text-power transition-[filter,transform] duration-75",
        held
          ? "translate-y-px [filter:drop-shadow(0_0_1px_#ff3535)] opacity-80"
          : "[filter:drop-shadow(0_0_1.6px_#ff3535)_drop-shadow(0_0_5.5px_#ff3535)_drop-shadow(0_0_11px_rgb(255_53_53/0.6))]",
        "focus-visible:outline-2 focus-visible:outline-foreground",
        className,
      )}
    >
      <Power size={20} />
    </button>
  );
}
