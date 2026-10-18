/*
  What people leave on the road, drawn on the same 16 × 16 grid as the characters and pixel
  icons: chunky strokes so they still read as blocks when extruded into 3D on the map, and
  square corners throughout. "#" is the drop's color, "-" a darker shade of it (a spine), "+" a
  light accent (a label, a ribbon); "." is empty. All three solid marks count as the block.
*/

export type DropKind = "story" | "question" | "note";

export const GLYPHS: Record<DropKind, string[]> = {
  /**
   * A hardcover, standing up: the cover with a darker spine down its left edge, a title label,
   * and a ribbon bookmark hanging out of the bottom. Extruded, its sides are cream page edges
   * (DROP_PAINT), so it turns like a real book.
   */
  story: [
    "................",
    "..-###########..",
    "..-###########..",
    "..-###########..",
    "..-##++++++###..",
    "..-##++++++###..",
    "..-###########..",
    "..-##++++#####..",
    "..-###########..",
    "..-###########..",
    "..-###########..",
    "..-###########..",
    "..-###########..",
    "..-###########..",
    ".........+......",
    ".........+......",
  ],
  /** A retro question mark. */
  question: [
    "................",
    "....########....",
    "...##########...",
    "..###......###..",
    "..###......###..",
    "...........###..",
    "..........###...",
    "........####....",
    ".......###......",
    ".......###......",
    ".......###......",
    "................",
    ".......###......",
    ".......###......",
    "................",
    "................",
  ],
  /** A note with a folded corner and its lines cut through. */
  note: [
    "................",
    "...#######......",
    "...########.....",
    "...#########....",
    "...##########...",
    "...##########...",
    "...##......##...",
    "...##########...",
    "...##......##...",
    "...##########...",
    "...##....####...",
    "...##########...",
    "...##########...",
    "................",
    "................",
    "................",
  ],
};

/**
 * Each kind's color on the map: stories purple, notes yellow, questions blue.
 * People keep the square markers, so a colored block never reads as a person.
 */
export const DROP_COLOR: Record<DropKind, string> = {
  story: "var(--marker-magenta)",
  note: "var(--marker-lime)",
  question: "var(--marker-sky)",
};

export type Side = "top" | "bottom" | "left" | "right";

/** Paint beyond the drop's own color: the "-" and "+" marks, and walls that aren't its color. */
export const DROP_PAINT: Partial<Record<DropKind, { shade?: string; accent?: string; walls?: Partial<Record<Side, string>> }>> = {
  story: {
    shade: "color-mix(in oklab, var(--drop) 62%, black)",
    accent: "#f3ecda",
    // Page edges on three sides (lit from the top left), the spine on the left.
    walls: { top: "#fbf7ec", right: "#e4d9bf", bottom: "#c9bc9c", left: "color-mix(in oklab, var(--drop) 55%, black)" },
  },
};

export const DROP_NAME: Record<DropKind, [one: string, many: string]> = {
  story: ["story", "stories"],
  question: ["question", "questions"],
  note: ["note", "notes"],
};

/** A cell that's part of the block, whatever its paint. */
export const solid = (rows: string[], x: number, y: number) => {
  const c = rows[y]?.[x];
  return c !== undefined && c !== ".";
};

/** The cells painted `mark`, merged into horizontal runs so each row is a few rects, not sixteen. */
export function runs(rows: string[], mark: string, keep: (x: number, y: number) => boolean = () => true) {
  const out: { x: number; y: number; w: number }[] = [];
  rows.forEach((row, y) => {
    let start = -1;
    for (let x = 0; x <= row.length; x++) {
      const on = x < row.length && row[x] === mark && keep(x, y);
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        out.push({ x: start, y, w: x - start });
        start = -1;
      }
    }
  });
  return out;
}

export type Wall = { side: Side; x: number; y: number; length: number };

/**
 * The block's side walls: every edge between a filled cell and an empty one, merged into runs
 * (top and bottom walls run along a row, left and right walls down a column).
 */
export function walls(rows: string[]): Wall[] {
  const on = (x: number, y: number) => solid(rows, x, y);
  const out: Wall[] = [];
  const sweep = (side: Wall["side"], open: (x: number, y: number) => boolean, alongRows: boolean) => {
    const outer = alongRows ? rows.length : rows[0].length;
    const inner = alongRows ? rows[0].length : rows.length;
    for (let a = 0; a < outer; a++) {
      let start = -1;
      for (let b = 0; b <= inner; b++) {
        const [x, y] = alongRows ? [b, a] : [a, b];
        const edge = b < inner && on(x, y) && open(x, y);
        if (edge && start < 0) start = b;
        if (!edge && start >= 0) {
          out.push(alongRows ? { side, x: start, y: a, length: b - start } : { side, x: a, y: start, length: b - start });
          start = -1;
        }
      }
    }
  };
  sweep("top", (x, y) => !on(x, y - 1), true);
  sweep("bottom", (x, y) => !on(x, y + 1), true);
  sweep("left", (x, y) => !on(x - 1, y), false);
  sweep("right", (x, y) => !on(x + 1, y), false);
  return out;
}

/** Cells lit from above: the top edge of every shape, where the light catches it. */
export const litFromAbove = (rows: string[]) => (x: number, y: number) => !solid(rows, x, y - 1);
