"use client";

import { play } from "cuelume";
import { useEffect, useRef, useState } from "react";
import { DURATION_STEPS, MAX_MINUTES, formatDuration, nearestStep } from "@/lib/journey/duration";
import { cn } from "../ui/cn";
import { MessyText, type MessyLook } from "./MessyText";

/*
  The trip-length picker: a ruler you drag or flick under a fixed marker, like tuning a radio.
  Each tick is one step of DURATION_STEPS, so the ruler is finer for short trips and coarser
  for long ones, and a full day is a flick away. Tap the readout to type any length instead
  (up to MAX_MINUTES); the ruler then rests on the nearest tick. Native scrolling with snap points gives touch
  momentum for free; a mouse drags it by hand.
*/

const PITCH = 22; // px between ticks; keep in step with .drum-face in globals.css
const LABELS: Record<number, string> = {
  30: "30m", 60: "1h", 120: "2h", 180: "3h", 240: "4h", 360: "6h", 480: "8h", 720: "12h", 960: "16h", 1440: "24h",
};

export type TuningStripProps = {
  minutes: number;
  onChange: (minutes: number) => void;
  /** How rough the time readout looks. */
  look?: MessyLook;
  className?: string;
};

export function TuningStrip({ minutes, onChange, look = "tidy", className }: TuningStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const index = DURATION_STEPS.indexOf(nearestStep(minutes));
  /** Set while we scroll the strip ourselves, so that scroll doesn't report back as a change. */
  const steering = useRef(false);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const drag = useRef<{ x: number; left: number } | null>(null);
  const last = useRef(index);

  // Follow the value when it changes from outside (a quick pick, the drive time).
  useEffect(() => {
    const el = ref.current;
    if (!el || Math.round(el.scrollLeft / PITCH) === index) return;
    steering.current = true;
    last.current = index;
    // The drum clicks straight to the new value; no gliding.
    el.scrollTo({ left: index * PITCH });
    setTurn(el);
  }, [index]);

  const onScroll = () => {
    const el = ref.current!;
    setTurn(el);
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
    el.scrollTo({ left: Math.round(el.scrollLeft / PITCH) * PITCH });
  };

  return (
    <div className={cn("flex w-full flex-col items-center gap-5", className)}>
      <TypedDuration minutes={minutes} onChange={onChange} look={look} />
      {/* The drum sits in a recessed window, lit from above: dark at its rolled-away edges, bright where it faces you. */}
      <div className="relative w-full overflow-hidden border-y border-border bg-surface shadow-[inset_0_6px_10px_-4px_rgb(0_0_0/0.55),inset_0_-6px_10px_-4px_rgb(0_0_0/0.55)]">
        <span aria-hidden className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(90deg,var(--background)_0%,transparent_30%,transparent_70%,var(--background)_100%)]" />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1/2 bg-gradient-to-b from-foreground/10 to-transparent" />
        {/* The fixed needle the drum turns under. */}
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-0 z-20 h-9 w-0.5 -translate-x-1/2 bg-foreground shadow-[2px_0_3px_rgb(0_0_0/0.5)]" />
        <div
          ref={ref}
          role="slider"
          tabIndex={0}
          aria-label="Trip length: turn the dial"
          aria-valuemin={DURATION_STEPS[0]}
          aria-valuemax={DURATION_STEPS[DURATION_STEPS.length - 1]}
          aria-valuenow={minutes}
          aria-valuetext={formatDuration(minutes)}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="flex cursor-grab snap-x snap-mandatory overflow-x-auto overscroll-x-contain py-3 outline-none [scrollbar-width:none] focus-visible:outline-1 focus-visible:outline-foreground active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
        >
          <span aria-hidden className="shrink-0" style={{ width: `calc(50% - ${PITCH / 2}px)` }} />
          {DURATION_STEPS.map((m, i) => {
            const label = LABELS[m];
            const hour = m % 60 === 0;
            return (
              <span key={m} aria-hidden className="flex shrink-0 snap-center justify-center" style={{ width: PITCH }}>
                <span className="drum-face flex flex-col items-center gap-2" style={{ "--i": i } as React.CSSProperties}>
                  <span className={cn("w-px", label ? "h-5 bg-foreground" : hour ? "h-3.5 bg-foreground/60" : "h-2.5 bg-foreground/30")} />
                  <span className="h-3 text-[10px] leading-3 text-foreground/60">{label}</span>
                </span>
              </span>
            );
          })}
          <span aria-hidden className="shrink-0" style={{ width: `calc(50% - ${PITCH / 2}px)` }} />
        </div>
      </div>
    </div>
  );
}

/** Tell the ticks how far the drum has turned, so each can wrap itself around it (see .drum-face). */
function setTurn(el: HTMLDivElement) {
  el.style.setProperty("--turn", String(el.scrollLeft / PITCH));
}

/** The big readout. Tap it to type hours and minutes; Enter or tapping away sets them. */
function TypedDuration({ minutes, onChange, look }: { minutes: number; onChange: (minutes: number) => void; look: MessyLook }) {
  const [draft, setDraft] = useState<{ h: string; m: string } | null>(null);
  const hours = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (draft) hours.current?.select();
    // Only when editing starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft !== null]);

  if (!draft) {
    return (
      <button
        type="button"
        onClick={() => setDraft({ h: String(Math.floor(minutes / 60)), m: String(minutes % 60) })}
        aria-label={`Trip length ${formatDuration(minutes)}. Tap to type your own`}
        className="flex flex-col items-center gap-1"
      >
        <MessyText text={formatDuration(minutes)} look={look} className="font-display text-4xl uppercase tabular-nums" />
        <span className="text-[10px] text-foreground/50">Tap to type your own</span>
      </button>
    );
  }

  const commit = () => {
    const total = (parseInt(draft.h, 10) || 0) * 60 + (parseInt(draft.m, 10) || 0);
    setDraft(null);
    if (total > 0) onChange(Math.min(MAX_MINUTES, total));
  };
  const field = "w-[2.6ch] border-b border-foreground/40 bg-transparent text-center font-display text-4xl tabular-nums outline-none focus:border-foreground";
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 2);

  return (
    <form
      className="flex flex-col items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        commit();
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) commit();
      }}
      onKeyDown={(e) => e.key === "Escape" && setDraft(null)}
    >
      <div className="flex items-baseline gap-2">
        <input
          ref={hours}
          inputMode="numeric"
          aria-label="Hours"
          value={draft.h}
          onChange={(e) => setDraft({ ...draft, h: digits(e.target.value) })}
          className={field}
        />
        <span className="font-display text-xl uppercase">hr</span>
        <input
          inputMode="numeric"
          aria-label="Minutes"
          value={draft.m}
          onChange={(e) => setDraft({ ...draft, m: digits(e.target.value) })}
          className={field}
        />
        <span className="font-display text-xl uppercase">min</span>
      </div>
      <button type="submit" className="text-[10px] text-foreground underline underline-offset-2">
        Set
      </button>
    </form>
  );
}
