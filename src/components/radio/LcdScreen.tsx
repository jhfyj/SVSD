import type { ReactNode } from "react";
import { cn } from "../ui/cn";

export type LcdScreenProps = { children?: ReactNode; className?: string };

/** Green LCD panel used for the radio display and the profile avatar. */
export function LcdScreen({ children, className }: LcdScreenProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-lcd text-lcd-ink shadow-[var(--lcd-inset)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 8×8 pixel mascot drawn on the LCD. */
const MASCOT = [
  "..####..",
  ".######.",
  "##.##.##",
  "########",
  "########",
  ".#.##.#.",
  "#......#",
  ".#....#.",
];

export function PixelMascot({ size = 4 }: { size?: number }) {
  return (
    <svg
      role="img"
      aria-label="Mascot"
      width={8 * size}
      height={8 * size}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      className="fill-current"
    >
      {MASCOT.flatMap((row, y) =>
        [...row].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)),
      )}
    </svg>
  );
}
