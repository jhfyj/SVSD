"use client";

import { useEffect, useId, useRef, type ReactElement } from "react";

/*
  The Caravan camel (public/caravan-logo.svg), drawn inline from its pixel grid so its parts can
  move. Hover it and it walks the road: the legs swing from the hip, the body sinks on each
  footfall, the head nods a beat behind, the pack rides the bob and sways, and a dotted road runs
  out ahead and slides by underneath. The pixels stay square; they just move between the gridlines.
  It walks while the pointer is over the nearest [data-camel-walk] (or the camel itself), and eases
  back to standing when it leaves. Styles: about-panel.css.

  Camel walk — hover (fine pointers only)
    pivot:   legs at the hip, head where it meets the neck, the pack at the middle of its base
    travel:  legs ±11.5° (a planted foot slides back at the road's speed), a swinging foot lifts 24;
             body sinks 16 on each footfall; head dips 6°; pack lags the body by up to 20 and rocks ±5°
    curve:   ease-in-out swings, linear stance and road   time: 1200ms a stride, looping while hovered
    light:   the faces travel with their part, so the light from the top left stays put
    sound:   none (the About card sits outside the product)
    reduced: stands still
*/

/** One letter per pixel, 16 wide, rows from y = 32 down. g green, h highlight, d pack strap, W / c pack. */
const CAMEL = [
  ".....WWWW.......",
  "....WccccW..hhh.",
  "....dddddd..gggh",
  "...hggggg...gg..",
  "..hgggggghhhg...",
  ".hggggggggggg...",
  "hggggggggggg....",
  "..gggggggggg....",
  "..gg.....gg.....",
  "..gg.....gg.....",
  "..gg.....gg.....",
  "..gg.....gg.....",
  "..gg.....gg.....",
  "..ggh....ggh....",
];

/** Front face, top face and right face for each kind of pixel, lit from the top left. */
const FACES: Record<string, [front: string, top: string, side: string]> = {
  g: ["#6dff5c", "#a8ff9c", "#2f9e27"],
  h: ["#c4ffbb", "#a8ff9c", "#2f9e27"],
  d: ["#3cbf33", "#257d1f", "#257d1f"],
  W: ["#fffaf0", "#fbf7ec", "#c9bc9c"],
  c: ["#f3ecda", "#fbf7ec", "#c9bc9c"],
};

const PX = 32;
/** How far each pixel is pushed back: up and to the right. */
const DEPTH_X = 35.2;
const DEPTH_Y = -25.6;

type Part = "legBack" | "legFront" | "body" | "head" | "pack";

function partOf(col: number, row: number): Part {
  if (row >= 8) return col <= 4 ? "legBack" : "legFront";
  if (row <= 2 && col >= 4 && col <= 9) return "pack";
  if (row <= 3 && col >= 12) return "head";
  return "body";
}

const filled = (col: number, row: number) => (CAMEL[row]?.[col] ?? ".") !== ".";

/**
  Each part as two layers: its pushed-back faces, and its front faces. All the back faces are drawn
  before any front face, so a part moving over another never shows a side through a front.
*/
const PARTS = (() => {
  const parts: Record<Part, { back: ReactElement[]; front: ReactElement[] }> = {
    legBack: { back: [], front: [] },
    legFront: { back: [], front: [] },
    body: { back: [], front: [] },
    head: { back: [], front: [] },
    pack: { back: [], front: [] },
  };
  CAMEL.forEach((line, row) =>
    [...line].forEach((kind, col) => {
      if (kind === ".") return;
      const [front, top, side] = FACES[kind];
      const x = col * PX;
      const y = (row + 1) * PX;
      const part = parts[partOf(col, row)];
      // Faces only where nothing covers them; a hairline stroke in the same colour closes the seams.
      if (!filled(col, row - 1)) {
        part.back.push(
          <polygon key={`t${col},${row}`} fill={top} stroke={top} points={`${x},${y} ${x + PX},${y} ${x + PX + DEPTH_X},${y + DEPTH_Y} ${x + DEPTH_X},${y + DEPTH_Y}`} />,
        );
      }
      if (!filled(col + 1, row)) {
        const r = x + PX;
        part.back.push(
          <polygon key={`s${col},${row}`} fill={side} stroke={side} points={`${r},${y} ${r + DEPTH_X},${y + DEPTH_Y} ${r + DEPTH_X},${y + PX + DEPTH_Y} ${r},${y + PX}`} />,
        );
      }
      part.front.push(<rect key={`f${col},${row}`} x={x} y={y} width={PX} height={PX} fill={front} stroke={front} />);
    }),
  );
  // One more row of each leg tucked behind the body, so a swinging leg never opens a gap at the hip.
  [...CAMEL[8]].forEach((kind, col) => {
    if (kind === ".") return;
    const [front] = FACES[kind];
    parts[partOf(col, 8)].front.unshift(<rect key={`hip${col}`} x={col * PX} y={8 * PX} width={PX} height={PX} fill={front} />);
  });
  return parts;
})();

/** The road's dots, a stride's travel (128) apart: from just behind the camel to well out in front. */
const ROAD = Array.from({ length: 13 }, (_, i) => (i - 1) * 128);
/** Where the road shows, in the camel's units; it fades in behind and away into the distance ahead. */
const ROAD_FROM = -128;
const ROAD_TO = 1280;

function Layer({ face }: { face: "back" | "front" }) {
  return (
    <>
      <g className="camel-leg-back">{PARTS.legBack[face]}</g>
      <g className="camel-leg-front">{PARTS.legFront[face]}</g>
      <g className="camel-torso">
        {PARTS.body[face]}
        <g className="camel-head">{PARTS.head[face]}</g>
        <g className="camel-pack">
          <g className="camel-pack-sway">{PARTS.pack[face]}</g>
        </g>
      </g>
    </>
  );
}

/** The parts that move, and how they come back to standing. */
const MOVING = ".camel-leg-back, .camel-leg-front, .camel-torso, .camel-head, .camel-pack, .camel-pack-sway";
const SETTLE = { duration: 480, easing: "cubic-bezier(0.23, 1, 0.32, 1)" };

export function CaravanCamel({ className = "" }: { className?: string }) {
  const fade = useId();
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const camel = svg.current;
    if (!camel) return;
    const area = (camel.closest("[data-camel-walk]") ?? camel) as HTMLElement;
    const parts = [...camel.querySelectorAll<SVGGElement>(MOVING)];
    let settling: Animation[] = [];

    const walk = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      settling.forEach((a) => a.cancel());
      settling = [];
      camel.setAttribute("data-walking", "");
    };
    // Read each part's pose before the walk stops, then ease it from there to standing.
    const stop = () => {
      if (!camel.hasAttribute("data-walking")) return;
      const poses = parts.map((p) => getComputedStyle(p).transform);
      camel.removeAttribute("data-walking");
      settling = parts.map((p, i) => p.animate([{ transform: poses[i] }, { transform: "none" }], SETTLE));
    };

    area.addEventListener("pointerenter", walk);
    area.addEventListener("pointerleave", stop);
    return () => {
      area.removeEventListener("pointerenter", walk);
      area.removeEventListener("pointerleave", stop);
      settling.forEach((a) => a.cancel());
    };
  }, []);

  return (
    <svg
      ref={svg}
      viewBox="-8 -1.6 563.2 483.2"
      overflow="visible"
      aria-hidden="true"
      focusable="false"
      strokeWidth={0.6}
      strokeLinejoin="round"
      className={`camel ${className}`}
    >
      <defs>
        <linearGradient id={`${fade}g`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.1" stopColor="#fff" />
          <stop offset="0.45" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={fade} maskUnits="userSpaceOnUse" x={ROAD_FROM} y="480" width={ROAD_TO - ROAD_FROM} height="64">
          <rect x={ROAD_FROM} y="480" width={ROAD_TO - ROAD_FROM} height="64" fill={`url(#${fade}g)`} />
        </mask>
      </defs>
      <g className="camel-road" mask={`url(#${fade})`}>
        <g className="camel-road-dots">
          {ROAD.map((x) => (
            <circle key={x} cx={x} cy={512} r={14} fill="currentColor" />
          ))}
        </g>
      </g>
      <Layer face="back" />
      <Layer face="front" />
    </svg>
  );
}
