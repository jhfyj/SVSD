"use client";

import { cn } from "../ui/cn";

export type ToggleSwitchProps = {
  on: boolean;
  onChange: (on: boolean) => void;
  label?: string;
  /** Show the OFF / ON words beside it (default). Off where the row is tight. */
  labels?: boolean;
  className?: string;
};

/**
 * Physical ON / OFF slider from the radio top bar.
 * On says itself three ways, so it never rests on colour alone: the knob slides right, the
 * track it uncovers lights `key-lit` green (green means on), and the knob carries the
 * rocker's glyphs, `O` off and `|` on.
 */
export function ToggleSwitch({ on, onChange, label = "Radio", labels = true, className }: ToggleSwitchProps) {
  return (
    <div className={cn("flex items-center gap-2 text-[11px] uppercase text-label/80", className)}>
      {labels && <span aria-hidden className={cn(!on && "text-foreground")}>Off</span>}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        data-cuelume-toggle=""
        className="relative flex h-11 w-14 items-center"
      >
        <span className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 bg-background shadow-[inset_1px_2px_3px_rgb(0_0_0/0.6)]" />
        {/* The lit half of the track: only shows once the knob has slid off it. */}
        <span
          className={cn(
            "absolute left-1 top-1/2 h-3 w-5 -translate-y-1/2 bg-[var(--key-lit)] [filter:var(--key-lit-glow-soft)]",
            "transition-opacity duration-150 ease-out",
            on ? "opacity-100" : "opacity-0",
          )}
        />
        <span
          className={cn(
            "absolute left-0 top-1/2 flex h-5 w-7 -translate-y-1/2 items-center justify-center transition-transform duration-150 ease-mechanical",
            "[background:var(--button-gradient)] shadow-[var(--button-highlight)]",
            on ? "translate-x-7" : "translate-x-0",
          )}
        >
          {on ? (
            <span className="h-2 w-0.5 bg-label" />
          ) : (
            <span className="size-2 rounded-full border border-label" />
          )}
        </span>
      </button>
      {labels && <span aria-hidden className={cn(on && "text-foreground")}>On</span>}
    </div>
  );
}
