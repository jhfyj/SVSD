"use client";

import { useEffect, useState } from "react";
import { cn } from "../ui/cn";
import { ScrambleText } from "@/components/ui/ScrambleText";

/*
  The splash after "Start journey" (Figma node 116:2974): a tuning dial under the FM readout hunts
  left and right across the band, each swing smaller and slower, then eases onto the station and
  holds, and the radio opens.
*/

const STATION = 89.9;
const TUNE_FROM = 87.5;
const TUNE_MS = 2600;
/** How long the splash stays before handing over to the radio. */
export const STARTING_MS = 3400;

/** The dial's band and spacing: a tick every 0.1 MHz, PX apart. */
const BAND_FROM = 86;
const BAND_TO = 94;
const PX = 8;
const TICKS = Math.round((BAND_TO - BAND_FROM) * 10) + 1;

/**
 * Where the dial sits at t (0–1): starts at TUNE_FROM and swings around the station, each swing
 * smaller (the envelope) and slower (the phase runs out of speed), until it rests on STATION.
 */
function tuned(t: number) {
  const envelope = (1 - t) ** 2.2;
  const phase = Math.PI * 3 * (1 - (1 - t) ** 2);
  return STATION + (TUNE_FROM - STATION) * envelope * Math.cos(phase);
}

export type StartingRadioProps = {
  /** Called once the splash has played (the app opens the radio here). */
  onDone?: () => void;
  className?: string;
};

export function StartingRadio({ onDone, className }: StartingRadioProps) {
  const [frequency, setFrequency] = useState(TUNE_FROM);

  // Tune up to the station.
  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = still ? 1 : Math.min(1, (now - start) / TUNE_MS);
      setFrequency(tuned(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Then hand over.
  useEffect(() => {
    if (!onDone) return;
    const timer = setTimeout(onDone, STARTING_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={cn(
        "grain flex min-h-dvh w-[min(393px,100vw)] flex-col overflow-hidden bg-background text-foreground",
        // Fades out just before the radio's blueprint takes over.
        onDone && "motion-safe:animate-[intro-pop_400ms_ease-in_3000ms_reverse_both]",
        className,
      )}
    >
      <div role="status" className="relative flex flex-1 flex-col items-center justify-center gap-10 pb-24">
        <p className="flex items-baseline gap-2 font-display">
          <span className="text-xl text-foreground/50">FM</span>
          <span className="text-5xl tabular-nums">{frequency.toFixed(1)}</span>
        </p>
        <Dial frequency={frequency} />
        <p className="font-mono text-xl uppercase"><ScrambleText>Starting your radio</ScrambleText></p>
      </div>
    </div>
  );
}

/** The dial window: a ruler of ticks sliding under a fixed needle, centred on `frequency`. */
function Dial({ frequency }: { frequency: number }) {
  return (
    <div aria-hidden className="relative h-12 w-[297px] overflow-hidden rounded-token border border-border">
      <div
        className="absolute inset-y-0 left-1/2 flex items-center"
        style={{ transform: `translateX(${-(frequency - BAND_FROM) * 10 * PX}px)` }}
      >
        {Array.from({ length: TICKS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "w-px shrink-0",
              i % 10 === 0 ? "h-6 bg-foreground" : i % 5 === 0 ? "h-4 bg-foreground/60" : "h-2.5 bg-foreground/35",
            )}
            style={{ marginRight: i < TICKS - 1 ? PX - 1 : 0 }}
          />
        ))}
      </div>
      {/* The needle */}
      <span className="absolute inset-y-1.5 left-1/2 w-px -translate-x-1/2 bg-foreground" />
    </div>
  );
}
