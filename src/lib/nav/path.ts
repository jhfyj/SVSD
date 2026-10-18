import { distanceBetween, type LatLng } from "@/lib/journey/geo";

/*
  Geometry for following a route: how far along it you are, where a distance along it lands,
  and which way it heads there. Flat-earth maths per segment, which is plenty at street scale.
*/

export type Path = {
  points: LatLng[];
  /** Metres from the start to each point. */
  along: number[];
  length: number;
};

export function measure(points: LatLng[]): Path {
  const along = [0];
  for (let i = 1; i < points.length; i++) along.push(along[i - 1] + distanceBetween(points[i - 1], points[i]));
  return { points, along, length: along[along.length - 1] ?? 0 };
}

const rad = Math.PI / 180;

/** Compass bearing from `a` to `b`, in degrees. */
export function bearing(a: LatLng, b: LatLng) {
  const y = Math.sin((b.lng - a.lng) * rad) * Math.cos(b.lat * rad);
  const x =
    Math.cos(a.lat * rad) * Math.sin(b.lat * rad) -
    Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lng - a.lng) * rad);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

/** The point `metres` from `from`, heading `deg`. */
export function offset(from: LatLng, deg: number, metres: number): LatLng {
  const k = 111320;
  return {
    lat: from.lat + (Math.cos(deg * rad) * metres) / k,
    lng: from.lng + (Math.sin(deg * rad) * metres) / (k * Math.cos(from.lat * rad)),
  };
}

/** The index of the segment holding distance `d`. */
function segmentAt(path: Path, d: number) {
  let lo = 0;
  let hi = path.along.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (path.along[mid] <= d) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** The point `d` metres along the path. */
export function pointAt(path: Path, d: number): LatLng {
  const { points, along } = path;
  if (points.length === 1 || d <= 0) return points[0];
  if (d >= path.length) return points[points.length - 1];
  const i = segmentAt(path, d);
  const seg = along[i + 1] - along[i];
  const t = seg ? (d - along[i]) / seg : 0;
  const a = points[i];
  const b = points[i + 1];
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

/** The way the road heads at `d`, looking a little ahead so tiny kinks don't swing the map. */
export function headingAt(path: Path, d: number, lookAhead = 25) {
  const a = pointAt(path, Math.min(d, path.length - 1));
  const b = pointAt(path, Math.min(d + lookAhead, path.length));
  return distanceBetween(a, b) < 0.5 ? null : bearing(a, b);
}

/** The path from `from` to `to` metres, for drawing the part you've driven. */
export function slice(path: Path, from: number, to: number): LatLng[] {
  if (to <= from) return [];
  const out = [pointAt(path, from)];
  for (let i = segmentAt(path, from) + 1; i < path.points.length && path.along[i] < to; i++) out.push(path.points[i]);
  out.push(pointAt(path, to));
  return out;
}

/**
 * Where `p` sits on the path: the distance along it and how far off it you are.
 * Prefers the stretch just ahead of `near` (where you were), so a route that doubles back
 * on itself doesn't make you jump to the other carriageway.
 */
export function locate(path: Path, p: LatLng, near = 0): { along: number; off: number } {
  const k = Math.cos(p.lat * rad) * 111320;
  let best = { along: 0, off: Infinity };
  let bestNear = { along: 0, off: Infinity };
  for (let i = 0; i < path.points.length - 1; i++) {
    const a = path.points[i];
    const b = path.points[i + 1];
    const bx = (b.lng - a.lng) * k;
    const by = (b.lat - a.lat) * 110540;
    const px = (p.lng - a.lng) * k;
    const py = (p.lat - a.lat) * 110540;
    const len2 = bx * bx + by * by;
    const t = len2 ? Math.min(1, Math.max(0, (px * bx + py * by) / len2)) : 0;
    const off = Math.hypot(px - t * bx, py - t * by);
    const along = path.along[i] + t * (path.along[i + 1] - path.along[i]);
    if (off < best.off) best = { along, off };
    if (along >= near - 100 && along <= near + 2000 && off < bestNear.off) bestNear = { along, off };
  }
  return bestNear.off < 60 ? bestNear : best;
}
