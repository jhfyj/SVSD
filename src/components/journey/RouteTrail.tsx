import { useMemo } from "react";
import type { LatLng } from "@/lib/journey/geo";
import { buildTrail, type TrailDot } from "@/lib/journey/trail";
import { cn } from "../ui/cn";

const WIDTH = 300;
const HEIGHT = 140;

const fills: Record<TrailDot["kind"], string> = {
  start: "fill-foreground",
  end: "fill-foreground",
  path: "fill-foreground/25",
  story: "fill-marker-lime",
  question: "fill-marker-magenta",
};

export type RouteTrailProps = {
  points: LatLng[];
  stories?: number;
  questions?: number;
  className?: string;
};

/** The route as a dotted staircase from you (first dot) to the destination (last dot), lit in order. */
export function RouteTrail({ points, stories = 0, questions = 0, className }: RouteTrailProps) {
  const dots = useMemo(
    () => buildTrail(points, { width: WIDTH, height: HEIGHT }, { stories, questions }),
    [points, stories, questions],
  );

  return (
    <svg
      viewBox={`-6 -6 ${WIDTH + 12} ${HEIGHT + 12}`}
      className={cn("block w-full", className)}
      role="img"
      aria-label={`Driving route, ${dots.length} steps from your location to the destination`}
    >
      {dots.map((dot, i) => (
        <circle
          // Re-keyed per route so the trail draws itself again when the destination changes.
          key={`${points.length}-${i}`}
          cx={dot.x}
          cy={dot.y}
          r={dot.kind === "start" || dot.kind === "end" ? 3.5 : 3}
          className={cn(fills[dot.kind], "[transform-box:fill-box] [transform-origin:center] motion-safe:animate-[trail-in_240ms_ease-out_both]")}
          style={{ animationDelay: `${i * 35}ms` }}
        />
      ))}
    </svg>
  );
}
