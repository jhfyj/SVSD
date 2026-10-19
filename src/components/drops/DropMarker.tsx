"use client";

import { useEffect, type CSSProperties, type Ref } from "react";
import { DROP_COLOR, type DropKind } from "./glyphs";
import { VoxelIcon } from "./VoxelIcon";

export type DropMarkerProps = {
  kind: DropKind;
  /** The spinning block, for a caller that drives the rotation every frame. */
  spinRef?: Ref<HTMLDivElement>;
  /** Grows with `--pull` and hops with `--lift` as the drop is pulled in. */
  scaleRef?: Ref<HTMLDivElement>;
  /** Spin on its own (CSS), for a drop nobody's camera loop is turning: the ones you leave. */
  spin?: boolean;
  /** Play the landing as it appears: the block falls in, squashes, settles (the Drop key's drops). */
  land?: boolean;
  /** Read out for a drop that stands alone, e.g. "Story you dropped". */
  label?: string;
};

/**
 * A drop waiting on the map, made to be spotted from down the road: the block floats a few
 * pixels up (one pixel at a time), over a square shadow and a square ring that keeps pulsing
 * out across the road, both laid flat on the tilted map. The same block marks a pickup waiting
 * ahead and a drop you left behind, so leaving and collecting look like one thing.
 */
export function DropMarker({ kind, spinRef, scaleRef, spin = false, land = false, label }: DropMarkerProps) {
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      className="relative flex flex-col items-center"
      style={{ "--drop": DROP_COLOR[kind] } as CSSProperties}
    >
      <div ref={scaleRef} className="relative z-10 [transform:translateY(var(--lift,0px))_scale(var(--pull,1))] [transform-origin:50%_100%]">
        <div className={land ? "drop-land" : undefined}>
          <div className="pixel-float [filter:drop-shadow(0_2px_0_rgb(0_0_0/0.5))]" style={{ "--pixel": "3px" } as CSSProperties}>
            {/* A book is a little thicker, so its page edges show as it turns. */}
            <VoxelIcon kind={kind} px={3} depth={kind === "story" ? 4 : 3} spin={spin} spinRef={spinRef} />
          </div>
        </div>
      </div>
      <div aria-hidden className="relative -mt-3 h-7 w-14 [perspective:220px]">
        <div className="absolute inset-0 [transform:rotateX(64deg)]">
          <span className="absolute inset-[28%] bg-black/50" />
          <span className="drop-ring absolute inset-0 border-2 [border-color:var(--drop)]" />
        </div>
      </div>
    </div>
  );
}

/** Where a drop was picked up: a few pixel stars twinkle on and off, then go. */
export function DropSparkle({ kind, onDone }: { kind: DropKind; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, SPARKLE_MS);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <div aria-hidden className="relative size-16" style={{ "--drop": DROP_COLOR[kind] } as CSSProperties}>
      <span className="pickup-pop-anchor absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2">
        <span className="pickup-pop-ring absolute -inset-2 border-2 [border-color:var(--drop)]" />
        <span className="pickup-pop-core absolute inset-1 border border-white bg-[var(--drop)]" />
      </span>
      {STARS.map(([x, y, delay, big], i) => (
        <span
          key={i}
          className="drop-twinkle absolute"
          style={{ left: x, top: y, animationDelay: `${delay}ms`, color: i % 2 ? "var(--drop)" : "white" }}
        >
          <Star big={big} />
        </span>
      ))}
    </div>
  );
}

const SPARKLE_MS = 2400;

/** [left, top, delay ms, big] for each star around the spot. */
const STARS: [number, number, number, boolean][] = [
  [6, 10, 0, true],
  [40, 2, 120, false],
  [28, 30, 60, true],
  [50, 36, 220, false],
  [2, 40, 300, false],
  [36, 18, 380, true],
];

/** A four-point pixel star: a plus, with a longer one for the big stars. */
function Star({ big }: { big: boolean }) {
  const s = big ? 9 : 5;
  const c = Math.floor(s / 2);
  return (
    <svg width={s * 2} height={s * 2} viewBox={`0 0 ${s} ${s}`} shapeRendering="crispEdges" fill="currentColor">
      <rect x={c} y={0} width={1} height={s} />
      <rect x={0} y={c} width={s} height={1} />
      {big && <rect x={c - 1} y={c - 1} width={3} height={3} />}
    </svg>
  );
}
