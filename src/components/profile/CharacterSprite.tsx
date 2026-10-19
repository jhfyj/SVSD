import type { CSSProperties } from "react";
import { getCharacter, type CharacterId } from "@/lib/profile/characters";
import { cn } from "../ui/cn";

export type CharacterSpriteProps = {
  character: CharacterId;
  /** Size of one sprite pixel in CSS px (the sprites are 16 × 16). */
  pixel?: number;
  /** Bob up and down; otherwise hold still. */
  playing?: boolean;
  className?: string;
};

/** One character from `CHARACTERS`, drawn in the current text color. */
export function CharacterSprite({ character, pixel = 4, playing = true, className }: CharacterSpriteProps) {
  const { name, frames } = getCharacter(character);
  return (
    <svg
      role="img"
      aria-label={name}
      width={16 * pixel}
      height={16 * pixel}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      fill="currentColor"
      className={cn(playing && "sprite-play", className)}
      style={{ "--sprite-pixel": `${pixel}px` } as CSSProperties}
    >
      {frames.map((rows, f) => (
        <g key={f} className={f === 0 ? "sprite-a" : "sprite-b"}>
          {rows.flatMap((rawRow, y) => {
            const row = rawRow.slice(0, 16);
            // One rect per horizontal run keeps the DOM small.
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
        </g>
      ))}
    </svg>
  );
}
