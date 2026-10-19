"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { CharacterSprite } from "@/components/profile/CharacterSprite";
import { CHARACTERS } from "@/lib/profile/characters";

/*
  The little LCD cartoons on the three overview cards. Each scene is drawn on one W x H pixel
  grid in the LCD's ink, one frame per tick (10 fps, so it steps like an LCD rather than glides).
  Sprite marks: "#" ink, "o" an opaque hole (a window or headlight that hides the road behind it),
  "." transparent. Reduced motion holds the first frame.
*/

const W = 60;
const H = 34;
const TICK_MS = 100;

type Sprite = readonly string[];
type Placed = { sprite: Sprite; x: number; y: number };

/** Ticks since mount, frozen at 0 for reduced motion. */
function useTick(ms = TICK_MS) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return tick;
}

/** Left half of a symmetric sprite, mirrored into the whole thing. */
const mirror = (half: string[]): Sprite => half.map((row) => row + [...row].reverse().join(""));

/** Paints road pixels (a set of "x,y") and sprites, later sprites covering earlier ones, into ink runs. */
function Grid({ road = [], sprites }: { road?: [number, number][]; sprites: Placed[] }) {
  const cells: (boolean | undefined)[][] = Array.from({ length: H }, () => Array<boolean | undefined>(W));
  for (const [x, y] of road) if (x >= 0 && x < W && y >= 0 && y < H) cells[y][x] = true;
  for (const { sprite, x: sx, y: sy } of sprites)
    sprite.forEach((row, dy) =>
      [...row].forEach((c, dx) => {
        const x = sx + dx, y = sy + dy;
        if (c === "." || x < 0 || x >= W || y < 0 || y >= H) return;
        cells[y][x] = c === "#";
      }),
    );
  const rects = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!cells[y][x]) continue;
      let end = x;
      while (cells[y][end + 1]) end++;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={end - x + 1} height={1} />);
      x = end;
    }
  return (
    <svg aria-hidden viewBox={`0 0 ${W} ${H}`} width={W * 3.5} height={H * 3.5} shapeRendering="crispEdges" fill="currentColor">
      {rects}
    </svg>
  );
}

/* ---------- Overview 1 · Stories: a car drives down the road past the drops, picking them up ---------- */

const CAR_BODY: Sprite = [
  "......#########.....",
  ".....#ooo#ooooo#....",
  "....#oooo#oooooo#...",
  ".##################.",
  "####################",
  "###....######....###",
];
const WHEEL: [Sprite, Sprite] = [
  [".##.", "####", ".##."],
  [".##.", "#oo#", ".##."],
];

/** The three things people leave on the road (src/components/drops/glyphs.ts), shrunk to LCD size. */
const MINI_DROPS: Sprite[] = [
  // story: a book with its spine and a ribbon
  ["#o####", "#o#oo#", "#o####", "#o#o##", "#o####", "#o####", "....#."],
  // question
  [".####.", "##oo##", "...o##", "..##o.", "..##..", "......", "..##.."],
  // tip: a note with a folded corner
  ["####..", "#oo##.", "#oooo#", "#o##o#", "#oooo#", "#o##o#", "######"],
];
const DROP_X = [13, 29, 45];
const GROUND = 25;
const CAR_LOOP = 96; // ticks: drive across (84) plus a short empty road

export function StoriesScene() {
  const t = useTick();
  const lap = t % CAR_LOOP;
  const carX = lap - 22;
  const bounce = t % 6 < 3 ? 0 : 1;
  const wheel = WHEEL[Math.floor(t / 2) % 2];
  const front = carX + 17;

  const road: [number, number][] = [];
  for (let x = 0; x < W; x++) road.push([x, GROUND]);
  for (let x = 0; x < W; x++) if ((x + 2) % 8 < 4) road.push([x, GROUND + 3]);

  const sprites: Placed[] = [];
  MINI_DROPS.forEach((sprite, i) => {
    const cx = DROP_X[i];
    const since = front - cx; // ticks since the car's nose reached it
    const bob = Math.floor((t + i * 4) / 6) % 2;
    if (since < 0) {
      sprites.push({ sprite, x: cx - 3, y: 10 + bob });
      sprites.push({ sprite: ["..##.."], x: cx - 3, y: GROUND - 2 }); // its shadow on the road
    } else if (since < 8) {
      // Picked up: it hops up and blinks out.
      if (since % 2 === 0) sprites.push({ sprite, x: cx - 3, y: 10 - Math.min(since, 5) });
    }
  });
  sprites.push({ sprite: CAR_BODY, x: carX, y: GROUND - 8 - bounce });
  sprites.push({ sprite: wheel, x: carX + 3, y: GROUND - 3 });
  sprites.push({ sprite: wheel, x: carX + 13, y: GROUND - 3 });
  return <Grid road={road} sprites={sprites} />;
}

/* ---------- Overview 2 · Company: a truck and an SUV, head on, driving side by side ---------- */

const TRUCK = mirror([
  "...#######",
  "...#oooooo",
  ".###oooooo",
  ".#.#oooooo",
  "...#######",
  "..########",
  "..#ooo####",
  "..#ooo#o#o",
  "..########",
  "..#o#o#o#o",
  "..########",
  "..###.....",
  "..###.....",
]);
const SUV = mirror([
  "..........",
  "....######",
  "...#oooooo",
  "..#ooooooo",
  ".##ooooooo",
  "..########",
  ".#########",
  ".#oo######",
  ".#oo###o#o",
  ".#########",
  ".#########",
  ".##.......",
  ".##.......",
]);

/** A straight line of pixels from (x0, y0) to (x1, y1). */
function line(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const out: [number, number][] = [];
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) out.push([Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps)]);
  return out;
}

const HORIZON = 7;

export function CompanyScene() {
  const t = useTick();
  const road: [number, number][] = [
    ...line(0, HORIZON, W - 1, HORIZON).filter(([x]) => x < 24 || x > 35 || x % 2 === 0),
    ...line(25, HORIZON, 1, H - 1),
    ...line(34, HORIZON, 58, H - 1),
  ];
  // Centre-line dashes come toward you, getting longer as they get closer.
  for (let k = 0; k < 4; k++) {
    const p = ((t * 0.9 + k * 7) % 27) / 27; // 0 at the horizon, 1 at the bottom
    const y = Math.round(HORIZON + 1 + p * p * (H - HORIZON - 1));
    const len = 1 + Math.round(p * 4);
    for (let d = 0; d < len; d++) road.push([29, y + d], [30, y + d]);
  }
  const truckBob = t % 8 < 4 ? 0 : 1;
  const suvBob = (t + 3) % 8 < 4 ? 0 : 1;
  return (
    <Grid
      road={road}
      sprites={[
        { sprite: TRUCK, x: 3, y: H - TRUCK.length - truckBob },
        { sprite: SUV, x: 37, y: H - SUV.length - suvBob },
      ]}
    />
  );
}

/* ---------- Overview 3 · Anonymous: the avatars slide in from the right, one every 3 seconds ---------- */

const HOLD_MS = 3000;

export function AvatarsScene() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => n + 1), HOLD_MS);
    return () => clearInterval(id);
  }, []);
  const now = CHARACTERS[i % CHARACTERS.length];
  const before = CHARACTERS[(i + CHARACTERS.length - 1) % CHARACTERS.length];
  return (
    <div aria-hidden className="relative h-[96px] w-[210px] overflow-hidden">
      <style>{`
        @keyframes ov-in { from { transform: translateX(150px); } to { transform: translateX(0); } }
        @keyframes ov-out { from { transform: translateX(0); } to { transform: translateX(-150px); } }
        @media (prefers-reduced-motion: no-preference) {
          .ov-in { animation: ov-in 600ms steps(10) both; }
          .ov-out { animation: ov-out 600ms steps(10) both; }
        }
        @media (prefers-reduced-motion: reduce) { .ov-out { display: none; } }
      `}</style>
      {i > 0 && (
        <div key={`out-${i}`} className="ov-out absolute inset-y-0 left-[57px]">
          <CharacterSprite character={before.id} pixel={6} />
        </div>
      )}
      <div key={`in-${i}`} className="ov-in absolute inset-y-0 left-[57px]" style={{ "--pixel": "6px" } as CSSProperties}>
        <CharacterSprite character={now.id} pixel={6} />
      </div>
    </div>
  );
}
