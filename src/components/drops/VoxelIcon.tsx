import type { CSSProperties, Ref } from "react";
import { cn } from "../ui/cn";
import { DROP_COLOR, DROP_PAINT, GLYPHS, litFromAbove, runs, walls, type DropKind, type Side, type Wall } from "./glyphs";

/** The drop's color in light and shade: the face, its lit top edges, the back. */
const FACE = "var(--drop)";
const LIT = "color-mix(in oklab, var(--drop) 55%, white)";
const BACK = "color-mix(in oklab, var(--drop) 78%, black)";
/** The side walls, lit from the top left like the rest of the radio, unless the kind paints its own. */
const WALL: Record<Side, string> = {
  top: "color-mix(in oklab, var(--drop) 78%, white)",
  left: "color-mix(in oklab, var(--drop) 62%, black)",
  right: "color-mix(in oklab, var(--drop) 46%, black)",
  bottom: "color-mix(in oklab, var(--drop) 34%, black)",
};

/** One run of side wall, standing out of the face plane the block's full depth. */
function wallStyle({ side, x, y, length }: Wall, px: number, half: number, color: string): CSSProperties {
  const across = side === "top" || side === "bottom";
  const edge = side === "bottom" ? y + 1 : side === "right" ? x + 1 : across ? y : x;
  return across
    ? { left: x * px, top: edge * px - half, width: length * px, height: half * 2, transform: "rotateX(90deg)", background: color }
    : { left: edge * px - half, top: y * px, width: half * 2, height: length * px, transform: "rotateY(90deg)", background: color };
}

/** Rects for every cell painted `mark` (optionally only where `keep` says), in one fill. */
function Paint({ rows, mark, fill, keep }: { rows: string[]; mark: string; fill: string; keep?: (x: number, y: number) => boolean }) {
  return (
    <g style={{ fill }}>
      {runs(rows, mark, keep).map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} />
      ))}
    </g>
  );
}

/** A face of the block: the drop's color with its shade and accent marks, lit along its top edges. */
function Face({ kind, size, back, style }: { kind: DropKind; size: number; back?: boolean; style?: CSSProperties }) {
  const rows = GLYPHS[kind];
  const paint = DROP_PAINT[kind];
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className="absolute inset-0 [backface-visibility:hidden]"
      style={style}
    >
      {back ? (
        ["#", "-", "+"].map((m) => <Paint key={m} rows={rows} mark={m} fill={BACK} />)
      ) : (
        <>
          <Paint rows={rows} mark="#" fill={FACE} />
          <Paint rows={rows} mark="-" fill={paint?.shade ?? FACE} />
          <Paint rows={rows} mark="+" fill={paint?.accent ?? LIT} />
          <Paint rows={rows} mark="#" fill={LIT} keep={litFromAbove(rows)} />
        </>
      )}
    </svg>
  );
}

export type VoxelIconProps = {
  kind: DropKind;
  /** CSS px per grid cell. */
  px?: number;
  /** How many cells deep the block is. */
  depth?: number;
  /** Spin on its own (CSS). Leave off to drive the rotation yourself through spinRef. */
  spin?: boolean;
  spinRef?: Ref<HTMLDivElement>;
  className?: string;
};

/**
 * A drop as a solid block: the 16 × 16 glyph extruded `depth` cells deep, built like voxels in a
 * preserve-3d box: the face and back, plus a real wall along every edge of the shape, shaded by
 * which way it faces (a book's walls are its page edges and spine). It stays solid at every
 * angle as it turns. The back is flipped so it reads the right way round from behind.
 */
export function VoxelIcon({ kind, px = 3, depth = 3, spin = false, spinRef, className }: VoxelIconProps) {
  const rows = GLYPHS[kind];
  const size = 16 * px;
  const half = (depth * px) / 2;
  const painted = DROP_PAINT[kind]?.walls;
  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size, perspective: 520, "--drop": DROP_COLOR[kind] } as CSSProperties}
    >
      <div ref={spinRef} className={cn("absolute inset-0 [transform-style:preserve-3d]", spin && "voxel-spin")}>
        <Face kind={kind} size={size} back style={{ transform: `translateZ(${-half}px) rotateY(180deg)` }} />
        {walls(rows).map((w) => (
          <span key={`${w.side}${w.x}-${w.y}`} className="absolute" style={wallStyle(w, px, half, painted?.[w.side] ?? WALL[w.side])} />
        ))}
        <Face kind={kind} size={size} style={{ transform: `translateZ(${half}px)` }} />
      </div>
    </div>
  );
}

/** The same glyph, flat: in its own colors, or in one ink (`ink`) for the LCD, where accents are left unlit. */
export function PixelGlyph({ kind, px = 2, ink, className }: { kind: DropKind; px?: number; ink?: boolean; className?: string }) {
  const rows = GLYPHS[kind];
  const paint = DROP_PAINT[kind];
  return (
    <svg
      aria-hidden
      width={16 * px}
      height={16 * px}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      style={{ "--drop": DROP_COLOR[kind] } as CSSProperties}
    >
      {ink ? (
        <>
          <Paint rows={rows} mark="#" fill="currentColor" />
          <Paint rows={rows} mark="-" fill="currentColor" />
        </>
      ) : (
        <>
          <Paint rows={rows} mark="#" fill={FACE} />
          <Paint rows={rows} mark="-" fill={paint?.shade ?? FACE} />
          <Paint rows={rows} mark="+" fill={paint?.accent ?? LIT} />
          <Paint rows={rows} mark="#" fill={LIT} keep={litFromAbove(rows)} />
        </>
      )}
    </svg>
  );
}
