"use client";

import { play } from "cuelume";
import { useEffect, useRef } from "react";
import { DURATION_STEPS, formatDuration, nearestStep } from "@/lib/journey/duration";
import { cn } from "../ui/cn";

/*
  The trip-length picker: a ruler you drag or flick under a fixed marker, like tuning a radio.
  Each tick is one step of DURATION_STEPS, so the ruler is finer for short trips and coarser
  for long ones, and 8 hours is a flick away. Native scrolling with snap points gives touch
  momentum for free; a mouse drags it by hand.
*/

const PITCH = 22; // px between ticks
const LABELS: Record<number, string> = { 30: "30m", 60: "1h", 120: "2h", 180: "3h", 240: "4h", 360: "6h", 480: "8h" };

export type TuningStripProps = {
  minutes: number;
  onChange: (minutes: number) => void;
  className?: string;
};

export function TuningStrip({ minutes, onChange, className }: TuningStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const index = DURATION_STEPS.indexOf(nearestStep(minutes));
  /** Set while we scroll the strip ourselves, so that scroll doesn't report back as a change. */
  const steering = useRef(false);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const drag = useRef<{ x: number; left: number } | null>(null);
  const last = useRef(index);
  const placed = useRef(false);

  // Follow the value when it changes from outside (a quick pick, the walk time).
  useEffect(() => {
    const el = ref.current;
    if (!el || Math.round(el.scrollLeft / PITCH) === index) return;
    steering.current = true;
    last.current = index;
    // The first placement jumps; later ones glide.
    el.scrollTo({ left: index * PITCH, behavior: placed.current ? "smooth" : "auto" });
    placed.current = true;
  }, [index]);

  const onScroll = () => {
    const el = ref.current!;
    clearTimeout(settle.current);
    settle.current = setTimeout(() => (steering.current = false), 150);
    if (steering.current) return;
    const i = Math.min(DURATION_STEPS.length - 1, Math.max(0, Math.round(el.scrollLeft / PITCH)));
    if (i === last.current) return;
    last.current = i;
    play("select", { volume: 0.35 });
    onChange(DURATION_STEPS[i]);
  };

  const step = (by: number) => {
    const i = Math.min(DURATION_STEPS.length - 1, Math.max(0, index + by));
    if (i === index) return;
    last.current = i;
    play("select", { volume: 0.35 });
    onChange(DURATION_STEPS[i]);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 4, PageDown: -4 }[e.key];
    if (by !== undefined) {
      e.preventDefault();
      step(by);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      step(e.key === "Home" ? -index : DURATION_STEPS.length);
    }
  };

  // Touch and trackpads scroll natively; a mouse needs dragging by hand.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    drag.current = { x: e.clientX, left: e.currentTarget.scrollLeft };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.scrollSnapType = "none";
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current) e.currentTarget.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    const el = e.currentTarget;
    el.style.scrollSnapType = "";
    el.scrollTo({ left: Math.round(el.scrollLeft / PITCH) * PITCH, behavior: "smooth" });
  };

  return (
    <div className={cn("flex w-full flex-col items-center gap-5", className)}>
      <output aria-hidden className="font-display text-4xl uppercase tabular-nums">
        {formatDuration(DURATION_STEPS[index])}
      </output>
      <div className="relative w-full">
        {/* The fixed marker the ruler slides under. */}
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2 bg-marker-lime" />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
        <div
          ref={ref}
          role="slider"
          tabIndex={0}
          aria-label="Trip length: drag the ruler"
          aria-valuemin={DURATION_STEPS[0]}
          aria-valuemax={DURATION_STEPS[DURATION_STEPS.length - 1]}
          aria-valuenow={DURATION_STEPS[index]}
          aria-valuetext={formatDuration(DURATION_STEPS[index])}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="flex cursor-grab snap-x snap-mandatory overflow-x-auto overscroll-x-contain py-2 outline-none [scrollbar-width:none] focus-visible:outline-1 focus-visible:outline-foreground active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
        >
          <span aria-hidden className="shrink-0" style={{ width: `calc(50% - ${PITCH / 2}px)` }} />
          {DURATION_STEPS.map((m) => {
            const label = LABELS[m];
            const hour = m % 60 === 0;
            return (
              <span key={m} aria-hidden className="flex shrink-0 snap-center flex-col items-center gap-2" style={{ width: PITCH }}>
                <span className={cn("w-px", label ? "h-9 bg-foreground" : hour ? "h-6 bg-foreground/60" : "h-4 bg-foreground/30")} />
                <span className="h-3 text-[10px] leading-3 text-foreground/60">{label}</span>
              </span>
            );
          })}
          <span aria-hidden className="shrink-0" style={{ width: `calc(50% - ${PITCH / 2}px)` }} />
        </div>
      </div>
    </div>
  );
}
