import { useMemo } from "react";
import type { LatLng } from "@/lib/journey/geo";
import { buildTrail, type TrailDot } from "@/lib/journey/trail";
import { cn } from "../ui/cn";

const SIZE = 120;
const PAD = 8;

const fills: Record<TrailDot["kind"], string> = {
  start: "fill-foreground",
  end: "fill-foreground",
  path: "fill-foreground/20",
  story: "fill-story",
  question: "fill-question",
};

export type JourneyShapeProps = {
  points: LatLng[];
  stories?: number;
  questions?: number;
  /** How far along the route the story worth repeating played, 0 to 1. Its dot gets a ring. */
  highlight?: number;
  /** ms before the first dot lights, to stagger several shapes. */
  delay?: number;
  className?: string;
};

/**
 * A past drive as its dotted staircase in a square: the same trail as setup and the recap, finer,
 * so the shape of the road is what you recognise. Lights up dot by dot once, when the screen opens.
 */
export function JourneyShape({ points, stories = 0, questions = 0, highlight, delay = 0, className }: JourneyShapeProps) {
  const dots = useMemo(
    () => buildTrail(points, { width: SIZE, height: SIZE, pitch: 7, maxDots: 64 }, { stories, questions }),
    [points, stories, questions],
  );

  // The story dot nearest where the highlighted story played.
  const ringed = useMemo(() => {
    if (highlight === undefined) return -1;
    const target = highlight * (dots.length - 1);
    let best = -1;
    dots.forEach((dot, i) => {
      if (dot.kind === "story" && (best < 0 || Math.abs(i - target) < Math.abs(best - target))) best = i;
    });
    return best;
  }, [dots, highlight]);

  const light = "[transform-box:fill-box] [transform-origin:center] motion-safe:animate-[trail-in_var(--motion-enter)_var(--motion-ease-out)_both]";

  return (
    <svg viewBox={`${-PAD} ${-PAD} ${SIZE + PAD * 2} ${SIZE + PAD * 2}`} className={cn("block w-full", className)} aria-hidden>
      {dots.map((dot, i) => (
        <circle
          key={i}
          cx={dot.x}
          cy={dot.y}
          r={dot.kind === "path" ? 1.75 : 2.5}
          className={cn(fills[dot.kind], light)}
          style={{ animationDelay: `${delay + i * 14}ms` }}
        />
      ))}
      {ringed >= 0 && (
        <circle
          cx={dots[ringed].x}
          cy={dots[ringed].y}
          r={5}
          strokeWidth={1}
          className={cn("fill-none stroke-story", light)}
          // Rings once the trail has reached it.
          style={{ animationDelay: `${delay + dots.length * 14 + 120}ms` }}
        />
      )}
    </svg>
  );
}
