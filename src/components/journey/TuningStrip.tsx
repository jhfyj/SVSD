"use client";

import { play } from "cuelume";
import { useEffect, useRef, useState } from "react";
import { DURATION_STEPS, MAX_MINUTES, formatDuration, nearestStep } from "@/lib/journey/duration";
import { cn } from "../ui/cn";
import { MessyText, type MessyLook } from "./MessyText";

/*
  The trip-length picker: an analog fader, like a channel on a mixing desk. Drag the cap along
  the slot, or tap the track to jump it there. Each notch is one step of DURATION_STEPS, so it is
  finer for short trips and coarser for long ones, up to a full day. Tap the readout to type any
  length instead (up to MAX_MINUTES); the cap then rests on the nearest notch. The cap follows
  the finger and jumps to new values; it never glides.
*/

const LAST = DURATION_STEPS.length - 1;
const LABELS: Record<number, string> = { 30: "30m", 60: "1h", 120: "2h", 240: "4h", 480: "8h", 960: "16h", 1440: "24h" };

export type TuningStripProps = {
  minutes: number;
  onChange: (minutes: number) => void;
  /** How rough the time readout looks. */
  look?: MessyLook;
  className?: string;
};

export function TuningStrip({ minutes, onChange, look = "tidy", className }: TuningStripProps) {
  const track = useRef<HTMLDivElement>(null);
  const index = DURATION_STEPS.indexOf(nearestStep(minutes));
  const dragging = useRef(false);

  const set = (i: number) => {
    const next = Math.min(LAST, Math.max(0, i));
    if (next === index) return;
    play("select", { volume: 0.35 });
    onChange(DURATION_STEPS[next]);
  };

  const fromPointer = (clientX: number) => {
    const box = track.current!.getBoundingClientRect();
    set(Math.round(((clientX - box.left) / box.width) * LAST));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 4, PageDown: -4 }[e.key];
    if (by !== undefined) {
      e.preventDefault();
      set(index + by);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      set(e.key === "Home" ? 0 : LAST);
    }
  };

  const at = (i: number) => `${(i / LAST) * 100}%`;

  return (
    <div className={cn("flex w-full flex-col items-center gap-6", className)}>
      <TypedDuration minutes={minutes} onChange={onChange} look={look} />
      <div
        role="slider"
        tabIndex={0}
        aria-label="Trip length: slide the fader"
        aria-valuemin={DURATION_STEPS[0]}
        aria-valuemax={DURATION_STEPS[LAST]}
        aria-valuenow={minutes}
        aria-valuetext={formatDuration(minutes)}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && fromPointer(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        className="w-full touch-none select-none px-10 py-1 outline-none focus-visible:outline-1 focus-visible:outline-foreground"
      >
        <div ref={track} aria-hidden className="relative h-[72px] cursor-pointer">
          {/* Notches above and below the slot, one per step; longer at the labelled lengths. */}
          {DURATION_STEPS.map((m, i) => {
            const major = LABELS[m] !== undefined;
            return (
              <span key={m} className="absolute inset-y-0 -translate-x-1/2" style={{ left: at(i) }}>
                <span className={cn("absolute top-2 w-px", major ? "h-3 bg-foreground/70" : "h-1.5 bg-foreground/25")} style={major ? undefined : { top: 14 }} />
                <span className={cn("absolute bottom-2 w-px", major ? "h-3 bg-foreground/70" : "h-1.5 bg-foreground/25")} style={major ? undefined : { bottom: 14 }} />
              </span>
            );
          })}
          {/* The slot the cap rides in. */}
          <span className="absolute inset-x-[-6px] top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-background shadow-[inset_0_1px_2px_rgb(0_0_0/0.8),0_1px_0_color-mix(in_srgb,var(--foreground)_12%,transparent)]" />
          {/* The cap: a chunky ridged block with an index line across its middle. */}
          <span
            className="absolute top-1/2 flex h-12 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col justify-between rounded-[3px] border border-black/60 bg-[linear-gradient(90deg,var(--surface)_0%,var(--surface-raised)_45%,var(--surface)_100%)] px-1 py-1.5 shadow-[0_6px_8px_-2px_rgb(0_0_0/0.7),inset_0_1px_0_color-mix(in_srgb,var(--foreground)_25%,transparent)] active:cursor-grabbing"
            style={{ left: at(index) }}
          >
            {[0, 1, 2].map((k) => <span key={k} className="h-px bg-black/40 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_15%,transparent)]" />)}
            <span className="h-0.5 bg-foreground" />
            {[0, 1, 2].map((k) => <span key={k} className="h-px bg-black/40 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_15%,transparent)]" />)}
          </span>
        </div>
        <div aria-hidden className="relative mt-1 h-3">
          {DURATION_STEPS.map((m, i) =>
            LABELS[m] ? (
              <span key={m} className="absolute -translate-x-1/2 text-[10px] leading-3 text-foreground/60" style={{ left: at(i) }}>
                {LABELS[m]}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
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
