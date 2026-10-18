"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cue, warmAhh } from "@/lib/sound";
import { plural } from "@/lib/plural";
import { DROP_COLOR, DROP_NAME, type DropKind } from "./glyphs";
import { PixelGlyph } from "./VoxelIcon";

type Point = { x: number; y: number };

/** ms: the pop, then the drop's flight into the LCD (it lands at FLIGHT_DELAY + FLIGHT_MS). */
const POP_MS = 240;
const FLIGHT_DELAY = 90;
const FLIGHT_MS = 1050;
/** Ghosts that trail the drop on its way in, like a comet's tail. */
const TRAIL = [55, 110, 165];

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

/**
 * The moment a drop is collected, over the whole radio (coordinates are the radio's own px).
 * It pops where your car is, out of a pixel starburst with a bright chime and a burst of pixels,
 * hops up, then arcs down into the LCD with a short trail. `onLanded` fires as it reaches the LCD.
 */
export function CollectFlight({ kind, from, to, onLanded }: { kind: DropKind; from: Point; to: Point; onLanded: () => void }) {
  const burst = useRef<HTMLDivElement>(null);
  const bits = useRef<(HTMLSpanElement | null)[]>([]);
  const xs = useRef<(HTMLDivElement | null)[]>([]);
  const ys = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // The payoff: the bright chime as it pops, then a warm "ahh" blooming under it.
    cue("success", { emphasis: "strong" });
    const ahh = setTimeout(warmAhh, 90);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onLanded();
      return () => clearTimeout(ahh);
    }
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const animations: Animation[] = [];

    // The pop: a starburst in three hard frames, like a sprite.
    animations.push(
      burst.current!.animate(
        [
          { transform: "translate(-50%, -50%) scale(0.5)", opacity: 1 },
          { transform: "translate(-50%, -50%) scale(1.2)", opacity: 1 },
          { transform: "translate(-50%, -50%) scale(1.6)", opacity: 0 },
        ],
        { duration: POP_MS, easing: "steps(3, end)", fill: "forwards" },
      ),
    );
    // Pixels thrown out from the pop: light, so they ease out and stop.
    bits.current.forEach((el, i) => {
      if (!el) return;
      const [angle, dist] = BITS[i];
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;
      animations.push(
        el.animate(
          [
            { transform: "translate(-50%, -50%)", opacity: 1 },
            { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`, opacity: 1, offset: 0.7 },
            { transform: `translate(calc(-50% + ${x * 1.1}px), calc(-50% + ${y * 1.1}px))`, opacity: 0 },
          ],
          { duration: 520, easing: EASE_OUT, fill: "forwards" },
        ),
      );
    });

    // The flight: x and y on separate layers so the path curves, a hop up then down into the LCD.
    xs.current.forEach((el, i) => {
      if (!el) return;
      const delay = FLIGHT_DELAY + (i === 0 ? 0 : TRAIL[i - 1]);
      animations.push(
        el.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dx}px)` }], {
          duration: FLIGHT_MS,
          delay,
          easing: EASE_IN_OUT,
          fill: "both",
        }),
      );
    });
    ys.current.forEach((el, i) => {
      if (!el) return;
      const delay = FLIGHT_DELAY + (i === 0 ? 0 : TRAIL[i - 1]);
      const ghost = i > 0;
      const shown = ghost ? 0.5 - i * 0.12 : 1;
      // Up like a coin out of the pop, then a long, easy fall into the LCD, shrinking and fading
      // into it over the last stretch so it's absorbed rather than switched off.
      const a = el.animate(
        [
          { transform: "translateY(0) scale(1)", opacity: ghost ? 0 : 1, easing: EASE_OUT },
          { transform: "translateY(-46px) scale(1.3)", opacity: shown, offset: 0.28, easing: EASE_IN_OUT },
          { transform: `translateY(${dy - 6}px) scale(0.6)`, opacity: ghost ? 0 : 1, offset: 0.86, easing: EASE_OUT },
          { transform: `translateY(${dy}px) scale(0.3)`, opacity: 0 },
        ],
        { duration: FLIGHT_MS, delay, fill: "both" },
      );
      animations.push(a);
      if (i === 0) {
        a.onfinish = () => {
          cue("select", { emphasis: "subtle", theme: "mech" });
          onLanded();
        };
      }
    });
    return () => {
      clearTimeout(ahh);
      animations.forEach((a) => a.cancel());
    };
    // Plays once per collected drop; the parent gives each flight its own key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const at = { left: from.x, top: from.y } as CSSProperties;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-30" style={{ "--drop": DROP_COLOR[kind] } as CSSProperties}>
      <div ref={burst} className="absolute" style={{ ...at, transform: "translate(-50%, -50%) scale(0)" }}>
        <Starburst />
      </div>
      {BITS.map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            bits.current[i] = el;
          }}
          className="absolute"
          style={{
            ...at,
            width: i % 3 ? 4 : 6,
            height: i % 3 ? 4 : 6,
            background: i % 2 ? "var(--drop)" : "white",
            transform: "translate(-50%, -50%)",
            opacity: 0,
          }}
        />
      ))}
      {[0, ...TRAIL].map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            xs.current[i] = el;
          }}
          className="absolute"
          style={at}
        >
          <div
            ref={(el) => {
              ys.current[i] = el;
            }}
          >
            <div className="-translate-x-1/2 -translate-y-1/2 [filter:drop-shadow(0_2px_0_rgb(0_0_0/0.5))]">
              <PixelGlyph kind={kind} px={i === 0 ? 2 : 1.5} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** [angle in radians, distance in px] for each pixel thrown from the pop. */
const BITS: [number, number][] = Array.from({ length: 12 }, (_, i) => [
  (i / 12) * Math.PI * 2 + (i % 2 ? 0.18 : -0.1),
  i % 3 === 0 ? 58 : i % 3 === 1 ? 42 : 30,
]);

/** An eight-point pixel starburst: a long plus and a shorter cross, with a bright core. */
function Starburst() {
  return (
    <svg width={68} height={68} viewBox="0 0 17 17" shapeRendering="crispEdges">
      <g fill="white">
        <rect x={8} y={0} width={1} height={17} />
        <rect x={0} y={8} width={17} height={1} />
        <rect x={7} y={4} width={3} height={9} />
        <rect x={4} y={7} width={9} height={3} />
      </g>
      <g style={{ fill: "var(--drop)" }}>
        {[3, 4, 12, 13].map((v) => (
          <rect key={`a${v}`} x={v} y={v} width={1} height={1} />
        ))}
        {[3, 4, 12, 13].map((v) => (
          <rect key={`b${v}`} x={16 - v} y={v} width={1} height={1} />
        ))}
        <rect x={6} y={6} width={5} height={5} />
      </g>
      <rect x={7} y={7} width={3} height={3} fill="white" />
    </svg>
  );
}

/**
 * The count in the LCD's top-left corner, in one ink: each kind's number in the segment font,
 * then its icon, like a counter on a device. Flickers when it goes up.
 */
export function CollectedTally({ counts, flash }: { counts: Partial<Record<DropKind, number>>; flash: number }) {
  const kinds = (Object.keys(counts) as DropKind[]).filter((k) => counts[k]);
  if (!kinds.length) return null;
  return (
    <div
      key={flash}
      role="status"
      aria-label={kinds.map((k) => `${plural(counts[k]!, ...DROP_NAME[k])} collected`).join(", ")}
      className="lcd-flash pointer-events-none absolute left-2.5 top-2 flex items-center gap-3 leading-none text-lcd-ink"
    >
      {kinds.map((k) => (
        <span key={k} className="flex items-center gap-1">
          <span className="font-display text-[20px] tabular-nums">{counts[k]}</span>
          <PixelGlyph kind={k} px={1.25} ink />
        </span>
      ))}
    </div>
  );
}
