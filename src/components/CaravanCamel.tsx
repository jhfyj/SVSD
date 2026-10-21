import { useId, type ReactElement } from "react";

/*
  The Caravan camel (public/caravan-logo.svg), drawn inline from its pixel grid so its parts can
  move. Hover it and it walks the road: the legs step one at a time, the body bobs on each footfall,
  the head nods a beat behind, the pack hops on its back and a dotted road slides by underneath.
  Every move is one pixel on a held frame (stop-motion, DESIGN.md §9.2). Styles: about-panel.css.

  Camel walk — hover (fine pointers only)
    pivot:   none; each part steps one grid pixel (32 units)
    travel:  a lifted foot goes up 1 and forward 1; body down 1 on footfalls; head dips 1 late; pack lifts 1
    curve:   step-end, 4 frames of 150ms   time: 600ms a stride, looping while hovered
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
  return parts;
})();

/** The road's dots: one stride (4 pixels) apart, wider than the camel so it can slide. */
const ROAD = Array.from({ length: 8 }, (_, i) => i * 4 * PX);

function Layer({ face }: { face: "back" | "front" }) {
  return (
    <>
      <g className="camel-leg-back">{PARTS.legBack[face]}</g>
      <g className="camel-leg-front">{PARTS.legFront[face]}</g>
      <g className="camel-torso">
        {PARTS.body[face]}
        <g className="camel-head">{PARTS.head[face]}</g>
        <g className="camel-pack">{PARTS.pack[face]}</g>
      </g>
    </>
  );
}

export function CaravanCamel({ className = "" }: { className?: string }) {
  const fade = useId();
  return (
    <svg
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
          <stop offset="0.25" stopColor="#fff" />
          <stop offset="0.75" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={fade} maskUnits="userSpaceOnUse" x="-64" y="480" width="640" height="64">
          <rect x="-64" y="480" width="640" height="64" fill={`url(#${fade}g)`} />
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
