import { useMemo } from "react";
import { MASK, MASK_H, MASK_W } from "@/lib/journey/worldmask";
import type { LatLng } from "@/lib/journey/geo";
import { cn } from "../ui/cn";

/*
  The dotted earth from the empty Destination screen (iPhone 16 - 60), drawn from the land mask in
  the week 6 world clock (DesignChallengeCode). Each dot is land if enough of its patch of the world is.
*/

const NORTH = 84;
const SOUTH = -58; // leaves Antarctica out, like week 6

const bits = Uint8Array.from(atob(MASK), (ch) => ch.charCodeAt(0));
const landAt = (lat: number, lng: number) => {
  const r = Math.min(MASK_H - 1, Math.max(0, Math.floor(90 - lat)));
  const c = ((Math.floor(lng + 180) % MASK_W) + MASK_W) % MASK_W;
  const i = r * MASK_W + c;
  return (bits[i >> 3] >> (i & 7)) & 1;
};

export type MapPin = LatLng & { id: string; tone: "you" | "place" };

export type WorldDotMapProps = {
  /** Longitude in the middle of the map; the world wraps around it. */
  centerLng?: number;
  /** Degrees of longitude across the map. */
  spanLng?: number;
  /** Dots across. */
  cols?: number;
  pins?: MapPin[];
  className?: string;
};

export function WorldDotMap({ centerLng = -10, spanLng = 230, cols = 80, pins = [], className }: WorldDotMapProps) {
  const deg = spanLng / cols;
  const rows = Math.round((NORTH - SOUTH) / deg);
  const west = centerLng - spanLng / 2;

  const land = useMemo(() => {
    let d = "";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let hits = 0;
        for (let a = 0; a < 3; a++) {
          for (let b = 0; b < 3; b++) hits += landAt(NORTH - (r + (a + 0.5) / 3) * deg, west + (c + (b + 0.5) / 3) * deg);
        }
        if (hits >= 3) d += `M${c * 5 + 1} ${r * 5 + 1}h3v3h-3z`;
      }
    }
    return d;
  }, [rows, cols, deg, west]);

  const cellOf = ({ lat, lng }: LatLng) => {
    const c = Math.floor((((((lng - west) % 360) + 360) % 360) / deg));
    const r = Math.floor((NORTH - lat) / deg);
    return c < cols && r >= 0 && r < rows ? { x: c * 5 + 2.5, y: r * 5 + 2.5 } : null;
  };

  return (
    <svg
      viewBox={`0 0 ${cols * 5} ${rows * 5}`}
      className={cn("block w-full", className)}
      role="img"
      aria-label={pins.length ? "World map with your location" : "World map"}
    >
      <path d={land} className="fill-foreground/25" />
      {pins.map((pin) => {
        const at = cellOf(pin);
        if (!at) return null;
        return (
          <g key={pin.id}>
            {pin.tone === "you" && (
              <circle cx={at.x} cy={at.y} r={2} className="animate-ping fill-marker-lime/60 [transform-box:fill-box] [transform-origin:center]" />
            )}
            <circle cx={at.x} cy={at.y} r={2} className={pin.tone === "you" ? "fill-marker-lime" : "fill-marker-sky"} />
          </g>
        );
      })}
    </svg>
  );
}
