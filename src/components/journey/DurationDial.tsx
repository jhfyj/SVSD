"use client";

import { useRef } from "react";
import { cn } from "../ui/cn";

/*
  The trip-length control from the Duration screens (iPhone 16 - 51 / 52), reworked from the week 6
  world clock's bezel: one full turn is an hour, the wedge is the time you've set, and turning past
  the top keeps counting into the next hour. Snaps to 5 minutes.
*/

const SIZE = 240;
const C = SIZE / 2;
const R = 112; // the rim's outer edge
const INNER = 88;
export const DURATION_STEP = 5;
export const DURATION_MIN = 5;
export const DURATION_MAX = 180;

const point = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [C + Math.sin(a) * r, C - Math.cos(a) * r] as const;
};

const angleOf = (e: React.PointerEvent, el: SVGSVGElement) => {
  const box = el.getBoundingClientRect();
  return (Math.atan2(e.clientX - (box.left + box.width / 2), -(e.clientY - (box.top + box.height / 2))) * 180) / Math.PI;
};

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

const TICKS = Array.from({ length: 60 }, (_, k) => {
  const len = k % 15 === 0 ? 12 : k % 5 === 0 ? 7 : 3;
  const [x1, y1] = point(k * 6, R - 2);
  const [x2, y2] = point(k * 6, R - 2 - len);
  return (
    <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} className={k % 5 === 0 ? "stroke-foreground/70" : "stroke-foreground/30"} />
  );
});

export type DurationDialProps = {
  minutes: number;
  onChange: (minutes: number) => void;
  className?: string;
};

export function DurationDial({ minutes, onChange, className }: DurationDialProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ angle: number; minutes: number } | null>(null);

  const clamp = (m: number) => Math.min(DURATION_MAX, Math.max(DURATION_MIN, m));
  const snap = (m: number) => clamp(Math.round(m / DURATION_STEP) * DURATION_STEP);

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current!;
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      // A synthetic pointer can't be captured; the drag still works.
    }
    const angle = angleOf(e, svg);
    // A press on the rim jumps the hand there, within the current hour.
    const hour = Math.floor((minutes - 0.01) / 60) * 60;
    const at = hour + (((angle + 360) % 360) / 6 || 60);
    drag.current = { angle, minutes: at };
    onChange(snap(at));
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const a = angleOf(e, svgRef.current!);
    let delta = a - d.angle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    d.angle = a;
    d.minutes = clamp(d.minutes + delta / 6);
    onChange(snap(d.minutes));
  };
  const onUp = () => {
    drag.current = null;
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 15, PageDown: -15 }[e.key];
    if (step !== undefined) {
      e.preventDefault();
      onChange(snap(minutes + step));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      onChange(e.key === "Home" ? DURATION_MIN : DURATION_MAX);
    }
  };

  // The wedge covers this hour's minutes; a whole hour is a full disc.
  const within = minutes % 60 || 60;
  const [ex, ey] = point(within * 6, INNER);
  const wedge =
    within === 60
      ? `M ${C} ${C - INNER} A ${INNER} ${INNER} 0 1 1 ${C - 0.01} ${C - INNER} Z`
      : `M ${C} ${C} L ${C} ${C - INNER} A ${INNER} ${INNER} 0 ${within > 30 ? 1 : 0} 1 ${ex} ${ey} Z`;
  const hours = Math.ceil(minutes / 60);
  const [hx, hy] = point(within * 6, R + 1);
  const [ix, iy] = point(within * 6, INNER);

  return (
    <svg
      ref={svgRef}
      viewBox={`-4 -4 ${SIZE + 8} ${SIZE + 8}`}
      className={cn("aspect-square w-full max-w-60 touch-none select-none outline-none focus-visible:outline-1 focus-visible:outline-foreground", className)}
      role="slider"
      tabIndex={0}
      aria-label="Trip length: turn the dial"
      aria-valuemin={DURATION_MIN}
      aria-valuemax={DURATION_MAX}
      aria-valuenow={minutes}
      aria-valuetext={formatDuration(minutes)}
      onKeyDown={onKey}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <circle cx={C} cy={C} r={R} className="fill-none stroke-foreground/30" />
      {TICKS}
      <circle cx={C} cy={C} r={INNER} className="fill-background stroke-foreground/50" />
      <path d={wedge} className="fill-foreground/25" />
      <line x1={ix} y1={iy} x2={hx} y2={hy} className="stroke-foreground" strokeWidth={1.5} />
      <circle cx={hx} cy={hy} r={4} className="fill-foreground" />
      <text x={C} y={C + 6} textAnchor="middle" className="fill-foreground font-display text-lg uppercase">
        {formatDuration(minutes)}
      </text>
      {/* One square per hour the trip runs into. */}
      {Array.from({ length: Math.ceil(DURATION_MAX / 60) }, (_, i) => (
        <rect
          key={i}
          x={C - 14 + i * 10}
          y={C + 22}
          width={6}
          height={6}
          className={i < hours ? "fill-foreground/80" : "fill-foreground/15"}
        />
      ))}
    </svg>
  );
}
