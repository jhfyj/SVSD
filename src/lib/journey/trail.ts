import type { LatLng } from "./geo";

/*
  The route drawn as the dotted staircase from the Destination screens (iPhone 16 - 62 / 63):
  the real path, snapped to a coarse grid and walked one dot at a time, across or down,
  never diagonally.
*/

export type TrailDot = { x: number; y: number; kind: "start" | "end" | "path" | "story" | "question" };

export type TrailOptions = {
  width: number;
  height: number;
  /** Space between dots, in px. Grows when the route would need more than `maxDots`. */
  pitch?: number;
  maxDots?: number;
};

type Cell = [col: number, row: number];

/** Grid cells along the route, start to end, each one step from the last. */
export function trailCells(points: LatLng[], cols: number, rows: number): Cell[] {
  if (points.length === 0) return [];
  // Equirectangular around the route's middle latitude is plenty at city scale.
  const midLat = (Math.min(...points.map((p) => p.lat)) + Math.max(...points.map((p) => p.lat))) / 2;
  const k = Math.cos((midLat * Math.PI) / 180);
  const xy = points.map((p) => [p.lng * k, -p.lat] as const);
  const minX = Math.min(...xy.map(([x]) => x));
  const maxX = Math.max(...xy.map(([x]) => x));
  const minY = Math.min(...xy.map(([, y]) => y));
  const maxY = Math.max(...xy.map(([, y]) => y));
  const span = Math.max(maxX - minX, ((maxY - minY) * (cols - 1)) / Math.max(1, rows - 1), 1e-9);
  const scale = (cols - 1) / span;
  // Centre the route in the grid.
  const offX = (cols - 1 - (maxX - minX) * scale) / 2;
  const offY = (rows - 1 - (maxY - minY) * scale) / 2;
  const toCell = ([x, y]: readonly [number, number]): Cell => [
    Math.round((x - minX) * scale + offX),
    Math.round((y - minY) * scale + offY),
  ];

  const cells: Cell[] = [toCell(xy[0])];
  for (let i = 1; i < xy.length; i++) {
    const [tc, tr] = toCell(xy[i]);
    let [c, r] = cells[cells.length - 1];
    const dc = tc - c;
    const dr = tr - r;
    const steps = Math.abs(dc) + Math.abs(dr);
    // Step along whichever axis is further behind the straight line, so the stairs stay even.
    for (let s = 0; s < steps; s++) {
      const doneC = Math.abs(c - (tc - dc));
      const doneR = Math.abs(r - (tr - dr));
      const behindC = Math.abs(dc) ? doneC / Math.abs(dc) : 1;
      const behindR = Math.abs(dr) ? doneR / Math.abs(dr) : 1;
      if (behindC <= behindR && c !== tc) c += Math.sign(dc);
      else r += Math.sign(dr);
      pushCell(cells, [c, r]);
    }
  }
  return cells;
}

/** Adds a cell, cutting out any loop that brings the route back over a dot it already has. */
function pushCell(cells: Cell[], cell: Cell) {
  const seen = cells.findIndex(([c, r]) => c === cell[0] && r === cell[1]);
  if (seen >= 0) cells.length = seen + 1;
  else cells.push(cell);
}

/**
 * The trail's dots in px, with stories and questions sprinkled along it.
 * Colored dots are a sample (one per few dots), not one per story.
 */
export function buildTrail(
  points: LatLng[],
  { width, height, pitch = 19, maxDots = 32 }: TrailOptions,
  counts: { stories: number; questions: number } = { stories: 0, questions: 0 },
): TrailDot[] {
  let cells: Cell[] = [];
  for (let p = pitch; p <= Math.max(width, height); p *= 1.25) {
    const cols = Math.max(2, Math.floor(width / p) + 1);
    const rows = Math.max(2, Math.floor(height / p) + 1);
    cells = trailCells(points, cols, rows);
    pitch = p;
    if (cells.length <= maxDots) break;
  }
  // Even a short walk gets a start and an end.
  if (cells.length === 1) cells.push([cells[0][0] + 1, cells[0][1]]);

  const usedW = (Math.max(...cells.map(([c]) => c)) - Math.min(...cells.map(([c]) => c))) * pitch;
  const usedH = (Math.max(...cells.map(([, r]) => r)) - Math.min(...cells.map(([, r]) => r))) * pitch;
  const minC = Math.min(...cells.map(([c]) => c));
  const minR = Math.min(...cells.map(([, r]) => r));
  const x0 = (width - usedW) / 2;
  const y0 = (height - usedH) / 2;

  const dots: TrailDot[] = cells.map(([c, r], i) => ({
    x: x0 + (c - minC) * pitch,
    y: y0 + (r - minR) * pitch,
    kind: i === 0 ? "start" : i === cells.length - 1 ? "end" : "path",
  }));

  const inner = dots.length - 2;
  const total = counts.stories + counts.questions;
  const colored = Math.min(total, Math.floor(inner / 3));
  if (colored > 0) {
    const questions = Math.round((colored * counts.questions) / total);
    const every = inner / colored;
    for (let n = 0; n < colored; n++) {
      const i = 1 + Math.floor(every * n + every / 2);
      // Spread the questions evenly among the stories.
      const isQuestion = Math.floor(((n + 1) * questions) / colored) > Math.floor((n * questions) / colored);
      dots[i].kind = isQuestion ? "question" : "story";
    }
  }
  return dots;
}

/** Placeholder pacing taken from the Figma screens (50 min → 24 stories, 6 questions) until there is real content. */
export function contentFor(minutes: number, destination = "") {
  if (/\bel paso\b/i.test(destination)) return { stories: 68, questions: 24, notes: 12 };
  return { stories: Math.max(1, Math.round(minutes * 0.48)), questions: Math.max(0, Math.round(minutes * 0.12)), notes: 0 };
}
