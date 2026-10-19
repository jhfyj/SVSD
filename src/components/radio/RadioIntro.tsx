"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { cue } from "@/lib/sound";
import { cn } from "../ui/cn";

/*
  The load-in from the "Starting your radio" splash into the radio. The screen first appears as
  a blueprint on the dark panel: a faint grid, then each part of the radio drawn as a gray frame
  with hatching and a Geist Mono tag, one after another. Then the casing flickers in around the
  frames, and each part flashes from its blueprint into the real, analog part, one at a time, in
  hard on/off frames like a tube warming up (no wipe). After a reference Jennifer shared, in
  SVSD's palette.
*/

type Part = { label: string; box: [x: number, y: number, w: number, h: number] };

/** Where each part of the 393×852 radio screen sits, in frame order. */
const PARTS: Part[] = [
  { label: "Map · 365×509", box: [14, 64, 365, 509] },
  { label: "Radio", box: [30, 605, 55, 20] },
  { label: "Switch", box: [26, 629, 46, 98] },
  { label: "LCD · 221×130", box: [156, 603, 221, 130] },
  { label: "Start journey", box: [26, 751, 195, 70] },
  { label: "Drop", box: [229, 751, 70, 70] },
  { label: "Settings", box: [307, 751, 70, 70] },
];

/** ms: frames draw in from FRAME_START, FRAME_GAP apart (each takes FRAME_MS). */
const FRAME_START = 250;
const FRAME_GAP = 110;
const FRAME_MS = 680;
/** ms: when the casing flickers in around the frames. */
const CASING_AT = FRAME_START + (PARTS.length - 1) * FRAME_GAP + FRAME_MS + 150;
/** ms: then each part flashes into the real thing, FLASH_GAP apart, each flash FLASH_MS long. */
const FLASH_AT = CASING_AT + 300;
const FLASH_GAP = 120;
const FLASH_MS = 360;
export const INTRO_MS = FLASH_AT + (PARTS.length - 1) * FLASH_GAP + FLASH_MS;

/** `skip`: show the radio straight away, without the load-in or its sounds (a scripted demo). */
export function RadioIntro({ children, className, skip = false }: { children: ReactNode; className?: string; skip?: boolean }) {
  const [done, setDone] = useState(skip);
  useIntroSounds(!skip);
  useEffect(() => {
    if (skip) return;
    const timer = setTimeout(() => setDone(true), INTRO_MS + 50);
    return () => clearTimeout(timer);
  }, [skip]);
  const vars = { "--casing-at": `${CASING_AT}ms` } as CSSProperties;

  return (
    <div className={cn("relative h-[852px] w-[393px] overflow-hidden bg-background", !done && "radio-intro", className)} style={vars}>
      {/* The real radio, under the blueprint the whole time */}
      {children}

      {!done && (
        <div aria-hidden className="radio-intro-blueprint pointer-events-none absolute inset-0">
          {/* The blank panel and its grid, until the casing flickers in */}
          <div className="radio-intro-backdrop absolute inset-0 bg-background">
            <div className="radio-intro-grid absolute inset-0" />
          </div>
          {PARTS.map((part, i) => (
            <Frame key={part.label} part={part} at={FRAME_START + i * FRAME_GAP} flash={FLASH_AT + i * FLASH_GAP} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The load-in, heard: a faint detent as each frame draws, like tuning across stations, a
 * click as each part flashes in, and a warm note when the radio is in. Silent if the browser
 * hasn't had a tap yet (a cold load straight onto /radio).
 */
function useIntroSounds(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const at = (ms: number, play: () => void) => setTimeout(play, ms);
    const timers = [
      ...PARTS.map((_, i) =>
        at(FRAME_START + i * FRAME_GAP, () =>
          cue("select", { emphasis: "subtle", volume: 0.35, theme: "mech", direction: "forward" }),
        ),
      ),
      ...PARTS.map((_, i) =>
        at(FLASH_AT + i * FLASH_GAP, () => cue("toggle", { emphasis: "subtle", volume: 0.3, theme: "mech" })),
      ),
      at(INTRO_MS, () => cue("ready")),
    ];
    return () => timers.forEach(clearTimeout);
  }, [on]);
}

/**
 * One part's blueprint: a blank cover over the real part, four lines drawn in turn, hatching and
 * a name tag. At `flash` the whole frame blinks out, back with a light flare, then is gone, leaving the
 * real part behind.
 */
function Frame({ part, at, flash }: { part: Part; at: number; flash: number }) {
  const [x, y, w, h] = part.box;
  const style = { left: x, top: y, width: w, height: h, "--at": `${at}ms`, "--flash": `${flash}ms` } as CSSProperties;
  return (
    <div className="radio-intro-frame absolute" style={style}>
      <span className="radio-intro-cover absolute inset-0 bg-background" />
      <span className="radio-intro-hatch absolute inset-0" />
      <span className="radio-intro-line radio-intro-top absolute inset-x-0 top-0 h-px" />
      <span className="radio-intro-line radio-intro-right absolute inset-y-0 right-0 w-px" />
      <span className="radio-intro-line radio-intro-bottom absolute inset-x-0 bottom-0 h-px" />
      <span className="radio-intro-line radio-intro-left absolute inset-y-0 left-0 w-px" />
      {/* Corner handles, like a selection in a design tool */}
      {(["-left-[2px] -top-[2px]", "-right-[2px] -top-[2px]", "-bottom-[2px] -left-[2px]", "-bottom-[2px] -right-[2px]"] as const).map((pos) => (
        <span key={pos} className={cn("radio-intro-handle absolute size-[5px] bg-background ring-1 ring-muted", pos)} />
      ))}
      <span
        className={cn(
          "radio-intro-tag absolute left-0 whitespace-nowrap bg-muted px-1 font-mono text-[9px] uppercase leading-[13px] text-background",
          y < 20 ? "top-full mt-1" : "bottom-full mb-1",
        )}
      >
        {part.label}
      </span>
      <span className="radio-intro-flare absolute inset-0 bg-label opacity-0" />
    </div>
  );
}
