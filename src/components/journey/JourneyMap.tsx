"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LatLng } from "@/lib/journey/geo";
import { buildTrail } from "@/lib/journey/trail";
import { MASK, MASK_H, MASK_W } from "@/lib/journey/worldmask";
import { cn } from "../ui/cn";
import { RouteTrail } from "./RouteTrail";

/*
  The Destination screen's stage: the whole dotted earth (land mask from the week 6 world clock),
  which zooms into the drive once there's a route and hands over to the dotted trail.
  The earth is drawn in degrees (x = longitude, y = -latitude) and zoomed by animating its viewBox;
  the zoom ends exactly where the trail puts its first and last dots, so the pins land on them.
*/

const NORTH = 84;
const SOUTH = -58; // leaves Antarctica out, like week 6
const DEG = 4; // degrees per land dot
const DOT = DEG * 0.62;

/** The trail's drawing box, as RouteTrail lays it out. */
const TRAIL = { width: 300, height: 140, pad: 6 };
const BOX = { x: -TRAIL.pad, y: -TRAIL.pad, w: TRAIL.width + TRAIL.pad * 2, h: TRAIL.height + TRAIL.pad * 2 };

const ZOOM_MS = 1600;

const bits = Uint8Array.from(atob(MASK), (ch) => ch.charCodeAt(0));
const landAt = (lat: number, lng: number) => {
  const r = Math.min(MASK_H - 1, Math.max(0, Math.floor(90 - lat)));
  const c = ((Math.floor(lng + 180) % MASK_W) + MASK_W) % MASK_W;
  const i = r * MASK_W + c;
  return (bits[i >> 3] >> (i & 7)) & 1;
};

/** Land dots for a world running from `west` to `west + 360`, as one path in degrees. */
function landPath(west: number) {
  let d = "";
  for (let lat = NORTH - DEG / 2; lat > SOUTH; lat -= DEG) {
    for (let x = west + DEG / 2; x < west + 360; x += DEG) {
      let hits = 0;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) hits += landAt(lat + (a * DEG) / 3, x + (b * DEG) / 3);
      // A round dot: two half-circle arcs.
      if (hits >= 3) d += `M${(x - DOT / 2).toFixed(2)} ${(-lat).toFixed(2)}a${DOT / 2} ${DOT / 2} 0 1 0 ${DOT} 0a${DOT / 2} ${DOT / 2} 0 1 0 -${DOT} 0`;
    }
  }
  return d;
}

type View = { x: number; y: number; w: number; h: number };

/** `lng` moved by whole turns into the world that starts at `west`. */
const unwrap = (lng: number, west: number) => ((((lng - west) % 360) + 360) % 360) + west;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smooth = (a: number, b: number, t: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

/**
 * Zoom between two views. The size changes at an even rate on a log scale, and the centre moves
 * in step with the size, so the destination stays in sight the whole way down.
 */
function between(a: View, b: View, t: number): View {
  const w = Math.exp(Math.log(a.w) + (Math.log(b.w) - Math.log(a.w)) * t);
  const h = Math.exp(Math.log(a.h) + (Math.log(b.h) - Math.log(a.h)) * t);
  const f = a.w === b.w ? t : (a.w - w) / (a.w - b.w);
  const cx = a.x + a.w / 2 + (b.x + b.w / 2 - (a.x + a.w / 2)) * f;
  const cy = a.y + a.h / 2 + (b.y + b.h / 2 - (a.y + a.h / 2)) * f;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export type JourneyMapProps = {
  here: LatLng | null;
  destination: LatLng | null;
  /** The driving route; when set, the map zooms into it and draws the trail. */
  route: LatLng[] | null;
  stories?: number;
  questions?: number;
  className?: string;
};

export function JourneyMap({ here, destination, route, stories = 0, questions = 0, className }: JourneyMapProps) {
  // The world is centred on you, so a drive never straddles its edge.
  const center = here?.lng ?? 0;
  const west = center - 180;
  const land = useMemo(() => landPath(west), [west]);

  const world: View = useMemo(() => {
    const h = (360 * BOX.h) / BOX.w;
    return { x: west, y: -NORTH - (h - (NORTH - SOUTH)) / 2, w: 360, h };
  }, [west]);

  // The view where the route's ends sit exactly on the trail's first and last dots.
  const zoomed: View | null = useMemo(() => {
    if (!route || route.length < 2) return null;
    const dots = buildTrail(route, TRAIL);
    const s = dots[0];
    const e = dots[dots.length - 1];
    const a = route[0];
    const b = route[route.length - 1];
    const k = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
    const dx = unwrap(b.lng, west) - unwrap(a.lng, west);
    const dy = a.lat - b.lat; // y runs down, latitude up
    let sx = Math.abs(e.x - s.x) > 1 && dx / (e.x - s.x) > 0 ? dx / (e.x - s.x) : NaN;
    let sy = Math.abs(e.y - s.y) > 1 && dy / (e.y - s.y) > 0 ? dy / (e.y - s.y) : NaN;
    if (Number.isNaN(sx) && Number.isNaN(sy)) sx = sy = 0.0005;
    if (Number.isNaN(sx)) sx = sy / k;
    if (Number.isNaN(sy)) sy = sx * k;
    const x = unwrap(a.lng, west) - s.x * sx;
    const y = -a.lat - s.y * sy;
    return { x: x + BOX.x * sx, y: y + BOX.y * sy, w: BOX.w * sx, h: BOX.h * sy };
  }, [route, west]);

  // 0 is the whole earth, 1 is zoomed into the drive.
  // Coming back to the tab with a route already drawn shows it straight away.
  const [t, setT] = useState(zoomed ? 1 : 0);
  const tRef = useRef(t);
  const target = zoomed ? 1 : 0;
  // Kept after the route clears, so the map can zoom back out the way it came in.
  const [lastZoom, setLastZoom] = useState<View | null>(zoomed);
  if (zoomed && zoomed !== lastZoom) setLastZoom(zoomed);

  useEffect(() => {
    const from = tRef.current;
    if (from === target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduce ? 1 : ZOOM_MS * Math.abs(target - from);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      tRef.current = from + (target - from) * p;
      setT(tRef.current);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const k = ease(t);
  const view = lastZoom ? between(world, lastZoom, k) : world;
  const landOpacity = 1 - smooth(0.3, 0.75, k);
  const arrived = t === 1 && route;

  const at = ({ lat, lng }: LatLng) => ({
    left: `${((unwrap(lng, west) - view.x) / view.w) * 100}%`,
    top: `${((-lat - view.y) / view.h) * 100}%`,
  });

  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      style={{ aspectRatio: `${BOX.w} / ${BOX.h}` }}
      role="img"
      aria-label={arrived ? "Your driving route" : here ? "World map with your location" : "World map"}
    >
      <svg
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        style={{ opacity: landOpacity }}
        aria-hidden
      >
        <path d={land} className="fill-foreground/25" />
      </svg>

      {!arrived && (
        <>
          {here && <Pin at={at(here)} you />}
          {destination && <Pin at={at(destination)} />}
        </>
      )}

      {arrived && (
        <RouteTrail points={route} stories={stories} questions={questions} className="absolute inset-0 size-full" />
      )}
    </div>
  );
}

function Pin({ at, you = false }: { at: { left: string; top: string }; you?: boolean }) {
  return (
    <span aria-hidden className="absolute size-0" style={at}>
      {you && <span className="absolute -left-1.5 -top-1.5 size-3 animate-ping rounded-full bg-marker-lime/50" />}
      <span className={cn("absolute -left-[3.5px] -top-[3.5px] size-[7px] rounded-full", you ? "bg-marker-lime" : "bg-foreground")} />
    </span>
  );
}
