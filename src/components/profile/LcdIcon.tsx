import type { CSSProperties } from "react";
import { cn } from "../ui/cn";

/**
 * Pixel icons for the sign-in and Allow access screens, drawn on the same 16 × 16 grid and in
 * the same one-ink style as the profile characters (src/lib/profile/characters.ts): each fills
 * the square, with straight edges and one-pixel corner steps. "1", "2" and "3" mark the message
 * bubble's dots, which hop in turn while someone types.
 */
const ICONS = {
  /** Sign-in options: the analog desk telephone is the one on screen. */
  telephone: [
    "................",
    "................",
    "...##########...",
    "..############..",
    "..###......###..",
    "................",
    ".....######.....",
    "....#......#....",
    "...#..####..#...",
    "..#..#....#..#..",
    "..#..#.##.#..#..",
    "..#..#....#..#..",
    "..#...####...#..",
    "..#..........#..",
    "..############..",
    "................",
  ],
  handset: [
    ".###............",
    "#####...........",
    "#####...........",
    "#####...........",
    ".####...........",
    "..###...........",
    "..###...........",
    "..####..........",
    "...####.........",
    "....#####.......",
    ".....#####.###..",
    "......#########.",
    "........#######.",
    "..........#####.",
    "...........###..",
    "................",
  ],
  mobile: [
    "................",
    "...##########...",
    "..#..........#..",
    "..#...####...#..",
    "..#..........#..",
    "..#.########.#..",
    "..#.#......#.#..",
    "..#.#......#.#..",
    "..#.#......#.#..",
    "..#.#......#.#..",
    "..#.########.#..",
    "..#..........#..",
    "..#....##....#..",
    "..#..........#..",
    "...##########...",
    "................",
  ],
  message: [
    "................",
    ".##############.",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..11..22..33..#",
    "#..11..22..33..#",
    "#..............#",
    "#..............#",
    "#..............#",
    ".##...#########.",
    "...#.#..........",
    "...##...........",
    "...#............",
    "................",
    "................",
  ],
  /** Shown in place of the message bubble when the code is wrong. */
  warning: [
    "................",
    ".......##.......",
    "......#..#......",
    "......#..#......",
    ".....#....#.....",
    ".....#.##.#.....",
    "....#..##..#....",
    "....#..##..#....",
    "...#...##...#...",
    "...#...##...#...",
    "..#..........#..",
    "..#....##....#..",
    ".#.....##.....#.",
    ".#............#.",
    ".##############.",
    "................",
  ],
  /** Solid rounded capsule in a U cradle, on a stem and base. */
  microphone: [
    "................",
    "......###.......",
    ".....#####......",
    ".....#####......",
    ".....#####......",
    ".....#####......",
    "..#..#####..#...",
    "..#..#####..#...",
    "..#...###...#...",
    "...#.......#....",
    "....##...##.....",
    "......###.......",
    ".......#........",
    ".......#........",
    ".....#####......",
    "................",
  ],
  /** Bell with a round dome stepping out to a flared lip, and a pointed clapper. */
  notifications: [
    "................",
    ".......#........",
    "......###.......",
    "....##...##.....",
    "...#.......#....",
    "...#.......#....",
    "...#.......#....",
    "...#.......#....",
    "...#.......#....",
    "..#.........#...",
    ".#...........#..",
    ".#############..",
    "................",
    "......###.......",
    ".......#........",
    "................",
  ],
  /** Map pin with a round hole, tapering to a point over a short ground line. */
  location: [
    "................",
    ".....#####......",
    "....#.....#.....",
    "...#..###..#....",
    "...#..#.#..#....",
    "...#..###..#....",
    "...#.......#....",
    "....#.....#.....",
    "....#.....#.....",
    ".....#...#......",
    "......#.#.......",
    ".......#........",
    "................",
    "....#######.....",
    "................",
    "................",
  ],
} as const;

export type PixelIconName = keyof typeof ICONS;

export type PixelIconProps = {
  icon: PixelIconName;
  /** Size of one pixel in CSS px; the icons are 16 × 16. */
  pixel?: number;
  /** Bob gently up and down. */
  floating?: boolean;
  /** Offsets the float so a column of icons doesn't move in lockstep. */
  delay?: number;
  /** Hop the message bubble's dots one after another. */
  typing?: boolean;
  label?: string;
  className?: string;
};

/** Rects for one horizontal run of `mark` per row, as in CharacterSprite. */
function runs(rows: readonly string[], mark: string) {
  return rows.flatMap((row, y) => {
    const rects = [];
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== mark) continue;
      let end = x;
      while (row[end + 1] === mark) end++;
      rects.push(<rect key={`${mark}${x}-${y}`} x={x} y={y} width={end - x + 1} height={1} />);
      x = end;
    }
    return rects;
  });
}

/**
 * Shift that puts the drawing's inked area in the middle of the 16 × 16 box. Odd sizes need half
 * an icon pixel, so the shift snaps to whole screen pixels (exact when `pixel` is even).
 */
function centering(rows: readonly string[], pixel: number) {
  let minX = 16, maxX = -1, minY = 16, maxY = -1;
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === ".") return;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }),
  );
  const snap = (units: number) => Math.round(units * pixel) / pixel;
  return { x: snap((minX + maxX + 1 - 16) / 2), y: snap((minY + maxY + 1 - 16) / 2) };
}

/** One pixel icon in the current text color, centered on its inked area. */
export function PixelIcon({ icon, pixel = 4, floating = true, delay = 0, typing = false, label, className }: PixelIconProps) {
  const rows = ICONS[icon];
  const shift = centering(rows, pixel);
  return (
    <svg
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      width={16 * pixel}
      height={16 * pixel}
      viewBox={`${shift.x} ${shift.y} 16 16`}
      shapeRendering="crispEdges"
      fill="currentColor"
      // The float moves one icon pixel at a time so the edges stay crisp.
      style={{ animationDelay: `${delay}ms`, "--pixel": `${pixel}px` } as CSSProperties}
      className={cn(floating && "pixel-float", className)}
    >
      {runs(rows, "#")}
      {["1", "2", "3"].map((dot, i) => (
        <g key={dot} className={typing ? "dot-hop" : undefined} style={{ animationDelay: `${i * 150}ms` }}>
          {runs(rows, dot)}
        </g>
      ))}
    </svg>
  );
}

export type LcdIconProps = { icon: PixelIconName; label: string; typing?: boolean; className?: string };

/** The green LCD panel at the top of the sign-in screens (Figma nodes 154:1297, 154:1302). */
export function LcdIcon({ icon, label, typing, className }: LcdIconProps) {
  return (
    <div className={cn("flex h-[130px] w-[221px] items-center justify-center bg-lcd text-lcd-ink shadow-[var(--lcd-inset)]", className)}>
      <PixelIcon icon={icon} pixel={5} label={label} typing={typing} />
    </div>
  );
}
