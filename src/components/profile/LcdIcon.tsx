import type { CSSProperties } from "react";
import { cn } from "../ui/cn";

/**
 * Pixel icons for the sign-in and Allow access screens, drawn on the same 16 × 16 grid and in
 * the same one-ink style as the profile characters (src/lib/profile/characters.ts): each fills
 * the square, with straight edges and one-pixel corner steps.
 */
const ICONS = {
  phone: [
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
    "#..##..##..##..#",
    "#..##..##..##..#",
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
  microphone: [
    "................",
    "......####......",
    ".....#....#.....",
    ".....#.##.#.....",
    ".....#....#.....",
    ".....#.##.#.....",
    "..#..#....#..#..",
    "..#..#.##.#..#..",
    "..#..#....#..#..",
    "...#..####..#...",
    "....#......#....",
    ".....######.....",
    ".......##.......",
    ".......##.......",
    "....########....",
    "................",
  ],
  notifications: [
    "................",
    ".......##.......",
    ".....######.....",
    "....#......#....",
    "....#......#....",
    "....#......#....",
    "....#......#....",
    "....#......#....",
    "....#......#....",
    "...#........#...",
    "..#..........#..",
    ".##############.",
    "................",
    "......####......",
    "................",
    "................",
  ],
  location: [
    "................",
    ".....######.....",
    "....#......#....",
    "...#........#...",
    "..#...####...#..",
    "..#...#..#...#..",
    "..#...#..#...#..",
    "..#...####...#..",
    "...#........#...",
    "....#......#....",
    ".....#....#.....",
    "......#..#......",
    ".......##.......",
    "................",
    "..############..",
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
  label?: string;
  className?: string;
};

/** One pixel icon in the current text color. */
export function PixelIcon({ icon, pixel = 4, floating = true, delay = 0, label, className }: PixelIconProps) {
  return (
    <svg
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      width={16 * pixel}
      height={16 * pixel}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      fill="currentColor"
      // The float moves one icon pixel at a time so the edges stay crisp.
      style={{ animationDelay: `${delay}ms`, "--pixel": `${pixel}px` } as CSSProperties}
      className={cn(floating && "pixel-float", className)}
    >
      {ICONS[icon].flatMap((row, y) => {
        // One rect per horizontal run, as in CharacterSprite.
        const rects = [];
        for (let x = 0; x < row.length; x++) {
          if (row[x] !== "#") continue;
          let end = x;
          while (row[end + 1] === "#") end++;
          rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={end - x + 1} height={1} />);
          x = end;
        }
        return rects;
      })}
    </svg>
  );
}

export type LcdIconProps = { icon: PixelIconName; label: string; className?: string };

/** The green LCD panel at the top of the sign-in screens (Figma nodes 154:1297, 154:1302). */
export function LcdIcon({ icon, label, className }: LcdIconProps) {
  return (
    <div className={cn("flex h-[130px] w-[221px] items-center justify-center bg-lcd text-lcd-ink shadow-[var(--lcd-inset)]", className)}>
      <PixelIcon icon={icon} pixel={5} label={label} />
    </div>
  );
}
