"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useState } from "react";
import { cue } from "@/lib/sound";
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
/** Thickness of the paddle, seen on its raised end. */
const DEPTH = 9;

const EASE = "cubic-bezier(0.3,1.4,0.5,1)";
const DURATION = 160;
const fade = (prop: string) => `${prop} ${DURATION}ms ${EASE}`;

/**
 * The power rocker from the radio console, built like a wall light switch: one solid paddle
 * rocks on a pivot across its middle. Press the bottom (|) and that half sinks into the
 * housing while the top half tips out toward you; press the top (O) for the reverse.
 * Nothing slides: only the tilt changes, so the light on the face and the end you can see
 * change with it. The switch is seen from slightly above, like a phone held in front of you.
 * Click or Space flips it too.
 */
export function RockerSwitch({ on, onChange, label = "Radio power", className }: RockerSwitchProps) {
  // While pressed, the side the finger is on (true = bottom/on). Null when nothing is held.
  const [pushing, setPushing] = useState<boolean | null>(null);
  const shown = pushing ?? on;
  // Positive rotateX tips the top back, so on (bottom pushed in) is a negative tilt.
  const tilt = (shown ? -1 : 1) * (pushing === null ? REST_TILT : PUSH_TILT);
  const lean = tilt / PUSH_TILT; // -1 (top out) … 1 (bottom out)

  const flip = (next: boolean) => {
    cue("toggle", { direction: next ? "forward" : "back", emphasis: "strong", theme: "mech" });
    onChange(next);
  };

  const sideOf = (e: PointerEvent<HTMLButtonElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    return e.clientY - box.top > box.height / 2;
  };

  const paddle: CSSProperties = {
    transform: `rotateX(${tilt}deg)`,
    transformOrigin: `50% 50% -${DEPTH}px`,
    transition: fade("transform"),
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
        if (pushing !== null && pushing !== on) flip(pushing);
        // Pushing the side that's already down still knocks.
        else if (pushing !== null) cue("tap", { emphasis: "subtle", theme: "mech" });
        setPushing(null);
      }}
      onPointerCancel={() => setPushing(null)}
      onClick={(e) => {
        // Pointer presses are handled above; this is for keyboard (Space / Enter).
        if (e.detail === 0) flip(!on);
      }}
      className={cn(
        "relative h-[98px] w-[46px] touch-none select-none bg-[#0a0a0a] p-[5px]",
        "shadow-[inset_0_2px_3px_rgb(0_0_0/0.9),0_1px_0_rgb(255_255_255/0.08)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        className,
      )}
    >
      {/* Housing the paddle rocks in, viewed from a little above */}
      <span className="relative block h-full w-full overflow-hidden bg-[#050505] shadow-[inset_0_2px_6px_rgb(0_0_0)] [perspective:220px] [perspective-origin:50%_-40%]">
        {/* The raised half shades the housing around the pressed half */}
        <span
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(0deg,rgb(0_0_0/0.9)_0%,transparent_50%)]"
          style={{ opacity: Math.max(0, -lean), transition: fade("opacity") }}
        />
        <span
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.9)_0%,transparent_50%)]"
          style={{ opacity: Math.max(0, lean), transition: fade("opacity") }}
        />

        {/* Paddle: one solid piece */}
        <span aria-hidden className="absolute inset-x-[2px] inset-y-[3px] [transform-style:preserve-3d]" style={paddle}>
          {/* Top end of the paddle, showing its thickness when the top tips out */}
          <span
            className="absolute inset-x-0 top-0 origin-top bg-[linear-gradient(180deg,#4a4a4a_0%,#2e2e2e_100%)]"
            style={{ height: DEPTH, transform: "rotateX(-90deg)" }}
          />

          {/* Face */}
          <span className="absolute inset-0 flex flex-col items-center bg-[linear-gradient(180deg,#232323_0%,#1a1a1a_50%,#141414_100%)] shadow-[inset_0_1px_0_rgb(255_255_255/0.1),inset_0_-1px_0_rgb(0_0_0/0.6)] [backface-visibility:hidden]">
            {/* Light from above: brighter as the face turns up (top pushed in), darker as it turns down */}
            <span
              className="absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255/0.16)_0%,rgb(255_255_255/0.04)_100%)]"
              style={{ opacity: Math.max(0, lean), transition: fade("opacity") }}
            />
            <span
              className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0)_0%,rgb(0_0_0/0.35)_100%)]"
              style={{ opacity: Math.max(0, -lean), transition: fade("opacity") }}
            />
            {/* Fine vertical grain on the plastic */}
            <span className="absolute inset-0 opacity-30 [background:repeating-linear-gradient(90deg,transparent_0_1px,rgb(255_255_255/0.04)_1px_2px)]" />
            {/* Seam where the two halves meet at the pivot */}
            <span className="absolute inset-x-[3px] top-1/2 h-px bg-black/50 shadow-[0_1px_0_rgb(255_255_255/0.05)]" />

            {/* O and | marks, printed on the face */}
            <span className="relative mt-[13px] size-[11px] rounded-full border-[1.5px] border-[#cfcfcf]" />
            <span className="relative mt-[29px] h-[9px] w-[2px] bg-[#cfcfcf]" />
          </span>
        </span>
      </span>
    </button>
  );
}
