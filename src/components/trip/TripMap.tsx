import { useMemo } from "react";
import { buildTrail } from "@/lib/journey/trail";
import type { TripSummary } from "@/lib/trip/trip";
import { cn } from "../ui/cn";
import { plural } from "@/lib/plural";

const WIDTH = 300;
const HEIGHT = 200;
const PAD = 10;
/** Shortest the cropped picture gets, in trail units, so a straight road still has some air. */
const MIN_HEIGHT = 60;

/**
 * The drive as the dotted trail from setup, with what happened along it:
 * numbered magenta squares where questions came up, sky dots where you shared the road on a call,
 * lime dots for stories. Lights up one dot at a time, frame by frame.
 */
export function TripMap({ trip, className }: { trip: TripSummary; className?: string }) {
  const dots = useMemo(() => {
    const trail = buildTrail(trip.route, { width: WIDTH, height: HEIGHT, pitch: 12, maxDots: 60 }, { stories: trip.stories, questions: 0 });
    const last = trail.length - 1;
    const index = (at: number) => Math.min(last - 1, Math.max(1, Math.round(at * last)));
    const calls = new Set(trip.calls.flatMap((c) => range(index(c.from), index(c.to))));
    const questions = new Map(trip.questions.map((q, i) => [index(q.at), i + 1]));
    return trail.map((dot, i) => ({
      ...dot,
      question: questions.get(i),
      call: calls.has(i) && dot.kind !== "start" && dot.kind !== "end",
    }));
  }, [trip]);

  // The trail is laid out in a 300×200 box, but a mostly flat drive only fills a strip of it. Crop
  // the picture to the dots so the summary and the questions sit right under the route (Jen, Oct 20
  // 2026: the questions were too far down the page), keeping a little height for a near-straight road.
  const ys = dots.length ? dots.map((d) => d.y) : [0, HEIGHT];
  const top = Math.min(...ys) - PAD;
  const height = Math.max(MIN_HEIGHT, Math.max(...ys) + PAD - top);
  const y0 = top - (height - (Math.max(...ys) + PAD - top)) / 2;

  return (
    <svg
      viewBox={`${-PAD} ${y0} ${WIDTH + PAD * 2} ${height}`}
      className={cn("block w-full overflow-visible", className)}
      role="img"
      aria-label={`Your route from ${trip.from} to ${trip.to}, with ${plural(trip.questions.length, "question")} and ${plural(trip.calls.length, "call")} along it`}
    >
      {dots.map((dot, i) => {
        const style = { animationDelay: `${i * 35}ms` };
        const frame = "[transform-box:fill-box] [transform-origin:center] motion-safe:animate-[trail-in_240ms_steps(2)_both]";
        if (dot.question) {
          return (
            <g key={i} className={frame} style={style}>
              <rect x={dot.x - 5} y={dot.y - 5} width={10} height={10} className="fill-marker-magenta stroke-marker-border" strokeWidth={1.5} />
              <text x={dot.x + 8} y={dot.y + 3} className="fill-foreground font-mono text-[9px]">
                {dot.question}
              </text>
            </g>
          );
        }
        const end = dot.kind === "start" || dot.kind === "end";
        const fill = end
          ? "fill-foreground"
          : dot.call
            ? "fill-marker-sky"
            : dot.kind === "story"
              ? "fill-marker-lime"
              : "fill-foreground/25";
        return <circle key={i} cx={dot.x} cy={dot.y} r={end ? 3.5 : 3} className={cn(fill, frame)} style={style} />;
      })}
    </svg>
  );
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
