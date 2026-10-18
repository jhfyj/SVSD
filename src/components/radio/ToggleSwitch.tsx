"use client";

import { cn } from "../ui/cn";

export type ToggleSwitchProps = {
  on: boolean;
  onChange: (on: boolean) => void;
  label?: string;
  className?: string;
};

/** Physical ON / OFF slider from the radio top bar. */
export function ToggleSwitch({ on, onChange, label = "Radio", className }: ToggleSwitchProps) {
  return (
    <div className={cn("flex items-center gap-2 text-[11px] uppercase text-label/80", className)}>
      <span aria-hidden className={cn(!on && "text-foreground")}>Off</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className="relative flex h-11 w-14 items-center"
      >
        <span className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 bg-background shadow-[inset_1px_2px_3px_rgb(0_0_0/0.6)]" />
        <span
          className={cn(
            "absolute top-1/2 h-5 w-7 -translate-y-1/2 transition-[left] duration-150",
            "[background:var(--button-gradient)] shadow-[var(--button-highlight)]",
            on ? "left-7" : "left-0",
          )}
        />
      </button>
      <span aria-hidden className={cn(on && "text-foreground")}>On</span>
    </div>
  );
}
