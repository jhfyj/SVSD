"use client";

import type { PointerEvent } from "react";
import { useState } from "react";
import { cn } from "../ui/cn";

export type RockerSwitchProps = {
  on: boolean;
  onChange: (on: boolean) => void;
  label?: string;
  className?: string;
};

/** How far the paddle tilts at rest, and how far while a finger is pushing it. */
const REST_TILT = 14;
const PUSH_TILT = 19;

/**
 * The power rocker from the radio console (built to replace the photo in Figma).
 * A paddle pivots in a recessed black housing: press the top (O) to turn off, the bottom (|)
 * to turn on. The pressed end sinks into shadow and the other end tips toward you, its metal
 * lip catching the light. Click or Space flips it too.
 */
export function RockerSwitch({ on, onChange, label = "Radio power", className }: RockerSwitchProps) {
  // While pressed, the side the finger is on (true = bottom/on). Null when nothing is held.
  const [pushing, setPushing] = useState<boolean | null>(null);
  const shown = pushing ?? on;
  // Pressing an end pushes it in, so the opposite end tips out toward you.
  const tilt = (shown ? -1 : 1) * (pushing === null ? REST_TILT : PUSH_TILT);

  const sideOf = (e: PointerEvent<HTMLButtonElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    return e.clientY - box.top > box.height / 2;
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setPushing(sideOf(e));
      }}
      onPointerUp={() => {
        if (pushing !== null && pushing !== on) onChange(pushing);
        setPushing(null);
      }}
      onPointerCancel={() => setPushing(null)}
      onClick={(e) => {
        // Pointer presses are handled above; this is for keyboard (Space / Enter).
        if (e.detail === 0) onChange(!on);
      }}
      className={cn(
        "relative h-[98px] w-[46px] touch-none select-none bg-[#0a0a0a] p-[5px]",
        "shadow-[inset_0_2px_3px_rgb(0_0_0/0.9),0_1px_0_rgb(255_255_255/0.08)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        className,
      )}
    >
      {/* Cavity the paddle pivots in */}
      <span className="relative block h-full w-full overflow-hidden bg-[#050505] shadow-[inset_0_2px_6px_rgb(0_0_0)] [perspective:150px]">
        {/* Shadow pooling at the pressed end */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 transition-[background] duration-150",
            shown
              ? "bg-[linear-gradient(0deg,rgb(0_0_0/0.85)_0%,transparent_45%)]"
              : "bg-[linear-gradient(180deg,rgb(0_0_0/0.85)_0%,transparent_45%)]",
          )}
        />

        {/* Paddle */}
        <span
          aria-hidden
          className="absolute inset-x-[2px] inset-y-[3px] flex flex-col items-center transition-transform duration-150 ease-[cubic-bezier(0.3,1.5,0.5,1)] [transform-style:preserve-3d]"
          style={{ transform: `rotateX(${tilt}deg)` }}
        >
          {/* Face: lit from above, so the half tipped toward you catches more light */}
          <span
            className={cn(
              "absolute inset-0 transition-[background,box-shadow] duration-150",
              shown
                ? "bg-[linear-gradient(180deg,#2a2a2a_0%,#1a1a1a_45%,#0d0d0d_100%)] shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]"
                : "bg-[linear-gradient(180deg,#0d0d0d_0%,#161616_55%,#262626_100%)] shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]",
            )}
          />
          {/* Fine vertical grain on the plastic */}
          <span className="absolute inset-0 opacity-30 [background:repeating-linear-gradient(90deg,transparent_0_1px,rgb(255_255_255/0.04)_1px_2px)]" />

          {/* O and | marks */}
          <span
            className={cn(
              "relative mt-[18px] size-[12px] rounded-full border-[1.5px] transition-colors duration-150",
              shown ? "border-[#7d7d7d]" : "border-[#e0e0e0] shadow-[0_0_3px_rgb(255_255_255/0.35)]",
            )}
          />
          <span
            className={cn(
              "relative mt-[16px] h-[9px] w-[2px] transition-colors duration-150",
              shown ? "bg-[#e0e0e0] shadow-[0_0_3px_rgb(255_255_255/0.35)]" : "bg-[#7d7d7d]",
            )}
          />

          {/* Metal lip on the raised end, catching the light */}
          <span
            className={cn(
              "absolute inset-x-0 h-[10px] transition-[top,background,box-shadow] duration-150",
              shown
                ? "top-0 bg-[linear-gradient(180deg,#f2f2f2_0%,#c9c9c9_40%,#9a9a9a_100%)] shadow-[inset_0_1px_0_#fff,0_1px_2px_rgb(0_0_0/0.6)]"
                : "top-[calc(100%-10px)] bg-[linear-gradient(180deg,#8d8d8d_0%,#bdbdbd_60%,#e3e3e3_100%)] shadow-[inset_0_-1px_0_rgb(255_255_255/0.8),0_-1px_2px_rgb(0_0_0/0.6)]",
            )}
          />
        </span>
      </span>
    </button>
  );
}
