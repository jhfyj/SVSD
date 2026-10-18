"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { cn } from "../ui/cn";

/*
  The load-in from the "Starting your radio" splash into the radio. The screen first appears as
  a blueprint on the dark panel: a faint grid, then each part of the radio drawn as a lime frame
  with hatching and a Geist Mono tag, one after another. Then a scan line sweeps down and the
  real radio fills in behind it, top to bottom, so each part resolves inside its own frame.
  After a reference Jennifer shared (a blueprint-to-page reveal), in SVSD's palette.
*/

type Part = { label: string; box: [x: number, y: number, w: number, h: number] };

/** Where each part of the 393×852 radio screen sits, in frame order. */
const PARTS: Part[] = [
  { label: "Clock", box: [17, 26, 116, 20] },
  { label: "Power", box: [346, 14, 44, 44] },
  { label: "Map · 365×509", box: [14, 64, 365, 509] },
  { label: "Radio", box: [30, 605, 55, 20] },
  { label: "Switch", box: [26, 629, 46, 98] },
  { label: "LCD · 221×130", box: [156, 603, 221, 130] },
  { label: "Start story", box: [26, 751, 195, 70] },
  { label: "Mic", box: [229, 751, 70, 70] },
  { label: "Speaker", box: [307, 751, 70, 70] },
];

/** ms: when the first frame starts, the gap between frames, and when the sweep starts and how long it runs. */
const FRAME_START = 250;
const FRAME_GAP = 110;
const SWEEP_AT = FRAME_START + PARTS.length * FRAME_GAP + 450;
const SWEEP_MS = 1100;
export const INTRO_MS = SWEEP_AT + SWEEP_MS;

export function RadioIntro({ children, className }: { children: ReactNode; className?: string }) {
  const [done, setDone] = useState(false);
  const vars = { "--sweep-at": `${SWEEP_AT}ms`, "--sweep-ms": `${SWEEP_MS}ms` } as CSSProperties;

  return (
    <div className={cn("relative h-[852px] w-[393px] overflow-hidden bg-background", !done && "radio-intro", className)} style={vars}>
      {/* The real radio, revealed top to bottom by the sweep */}
      <div className="radio-intro-page h-full w-full" onAnimationEnd={(e) => e.target === e.currentTarget && setDone(true)}>
        {children}
      </div>

      {!done && (
        <div aria-hidden className="radio-intro-blueprint pointer-events-none absolute inset-0">
          {/* Faint grid and column guides */}
          <div className="radio-intro-grid absolute inset-0" />
          {PARTS.map((part, i) => (
            <Frame key={part.label} part={part} at={FRAME_START + i * FRAME_GAP} />
          ))}
        </div>
      )}

      {/* The scan line leading the reveal */}
      {!done && <div aria-hidden className="radio-intro-scan pointer-events-none absolute inset-x-0 top-0 h-px bg-marker-lime" />}
    </div>
  );
}

/** One part's blueprint: four lines drawn in turn, hatching, and a name tag. */
function Frame({ part, at }: { part: Part; at: number }) {
  const [x, y, w, h] = part.box;
  const style = { left: x, top: y, width: w, height: h, "--at": `${at}ms` } as CSSProperties;
  return (
    <div className="radio-intro-frame absolute" style={style}>
      <span className="radio-intro-hatch absolute inset-0" />
      <span className="radio-intro-line radio-intro-top absolute inset-x-0 top-0 h-px" />
      <span className="radio-intro-line radio-intro-right absolute inset-y-0 right-0 w-px" />
      <span className="radio-intro-line radio-intro-bottom absolute inset-x-0 bottom-0 h-px" />
      <span className="radio-intro-line radio-intro-left absolute inset-y-0 left-0 w-px" />
      {/* Corner handles, like a selection in a design tool */}
      {(["-left-[2px] -top-[2px]", "-right-[2px] -top-[2px]", "-bottom-[2px] -left-[2px]", "-bottom-[2px] -right-[2px]"] as const).map((pos) => (
        <span key={pos} className={cn("radio-intro-handle absolute size-[5px] bg-background ring-1 ring-marker-lime", pos)} />
      ))}
      <span
        className={cn(
          "radio-intro-tag absolute left-0 whitespace-nowrap bg-marker-lime px-1 font-mono text-[9px] uppercase leading-[13px] text-black",
          y < 20 ? "top-full mt-1" : "bottom-full mb-1",
        )}
      >
        {part.label}
      </span>
    </div>
  );
}
