"use client";

import { useEffect, useState } from "react";
import { cn } from "../ui/cn";
import { TopBar } from "./TopBar";
import { ScrambleText } from "@/components/ui/ScrambleText";

/*
  The splash after "Start journey" (Figma node 116:2974): the dial tunes up to the station while
  a spiral draws itself in, like the trip being gathered in around you, then the radio opens.
*/

const STATION = 89.9;
const TUNE_FROM = 87.5;
const TUNE_MS = 2200;
/** How long the splash stays before handing over to the radio. */
export const STARTING_MS = 3400;

/** An outward spiral from just off centre, the way the Figma line winds out past the screen. */
function spiralPath() {
  const cx = 196;
  const cy = 440;
  const turns = 3.3;
  const steps = 260;
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = Math.PI * 0.35 + t * turns * Math.PI * 2;
    const r = 18 + t * 380;
    // Slightly taller than wide, like the hand-drawn original.
    points.push(`${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r * 1.12).toFixed(1)}`);
  }
  return `M${points.join("L")}`;
}
const SPIRAL = spiralPath();

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
      const eased = 1 - (1 - t) ** 3;
      setFrequency(TUNE_FROM + (STATION - TUNE_FROM) * eased);
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
        "rain flex min-h-dvh w-full max-w-[393px] flex-col overflow-hidden bg-background text-foreground",
        // Fades out just before the radio's blueprint takes over.
        onDone && "motion-safe:animate-[intro-pop_400ms_ease-in_3000ms_reverse_both]",
        className,
      )}
    >
      <svg aria-hidden viewBox="0 0 393 852" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full">
        <path
          d={SPIRAL}
          pathLength={1}
          fill="none"
          stroke="var(--spiral)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray={1}
          className="motion-safe:animate-[spiral-in_3s_cubic-bezier(0.4,0,0.2,1)_both]"
        />
      </svg>

      <TopBar />

      <div role="status" className="relative flex flex-1 flex-col items-center justify-center gap-12 pb-24">
        <p className="flex items-baseline gap-2 font-display">
          <span className="text-xl text-foreground/50">FM</span>
          <span className="text-5xl tabular-nums">{frequency.toFixed(1)}</span>
        </p>
        <p className="font-mono text-xl uppercase"><ScrambleText>Starting your radio</ScrambleText></p>
      </div>
    </div>
  );
}
