/*
  Address search and driving routes, from free OpenStreetMap services (no key):
  - Photon (photon.komoot.io) for the destination search, biased toward where you are.
  - OSRM (routing.openstreetmap.de) for the driving route, with turn-by-turn steps for the radio's map.
  Both are public servers with fair-use limits: fine for the prototype. For launch, point them at a
  keyed provider with the same APIs (Geoapify, Stadia) or host them.
*/

export type LatLng = { lat: number; lng: number };

export type Place = LatLng & {
  id: string;
  /** The first line: house number and street, or the place's name. */
  name: string;
  /** City, state and postcode. */
  detail: string;
};

/** One turn-by-turn step. */
export type RouteStep = {
  /** Like TURN_LEFT or RAMP_RIGHT (see ManeuverIcon). */
  maneuver?: string;
  instruction?: string;
  /** Metres. */
  distance: number;
};

export type Route = {
  /** The path, from origin to destination. */
  points: LatLng[];
  /** Turn-by-turn steps. */
  steps?: RouteStep[];
  /** Driving time in seconds. */
  duration: number;
  /** Metres. */
  distance: number;
  /** True when no driving route was found and the path is a straight line. */
  straight?: boolean;
};

const PHOTON = "https://photon.komoot.io/api/";
const OSRM = "https://routing.openstreetmap.de/routed-car/route/v1/driving/";

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

export function toPlace({ geometry, properties: p }: PhotonFeature): Place {
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const name = street || p.name || p.city || p.state || p.country || "Unknown place";
  const region = [p.state, p.postcode].filter(Boolean).join(" ");
  const detail = [p.name && street ? p.name : null, p.city ?? p.district ?? p.county, region || p.country]
    .filter(Boolean)
    .join(", ");
  const [lng, lat] = geometry.coordinates;
  return { id: `${p.osm_type ?? "x"}${p.osm_id ?? `${lat},${lng}`}`, name, detail, lat, lng };
}

/** Addresses and places matching `query`, the closest to `near` first. */
export async function searchPlaces(query: string, near: LatLng | null, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ q: query, limit: "6", lang: "en" });
  if (near) {
    params.set("lat", near.lat.toFixed(4));
    params.set("lon", near.lng.toFixed(4));
  }
  const res = await fetch(`${PHOTON}?${params}`, { signal });
  if (!res.ok) throw new Error(`Address search failed (${res.status})`);
  const data: { features: PhotonFeature[] } = await res.json();
  const seen = new Set<string>();
  return data.features.map(toPlace).filter((p) => !seen.has(p.id) && seen.add(p.id));
}

/** One number of a coordinate pair, with an optional degree sign and hemisphere letter. */
const COORD = String.raw`(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([NSEW])?`;
const COORD_PAIR = new RegExp("^" + COORD + String.raw`\s*[,\s]\s*` + COORD + "$", "i");

/**
 * Reads typed coordinates as a place: "37.7749, -122.4194", "37.7749 -122.4194" or
 * "37.7749° N, 122.4194° W" (latitude first, as Google Maps copies them). Null when it isn't coordinates.
 */
export function parseCoordinates(text: string): LatLng | null {
  const m = text.trim().match(COORD_PAIR);
  // Two bare whole numbers ("1 5", on the way to "1 5th Ave") are still an address being typed.
  if (!m || !/[.,°NSEW]/i.test(text)) return null;
  const signed = (value: string, hemi: string | undefined, negative: string) =>
    hemi?.toUpperCase() === negative ? -Math.abs(Number(value)) : Number(value);
  // Hemisphere letters can put longitude first ("122.4 W, 37.7 N").
  const lngFirst = /[EW]/i.test(m[2] ?? "") || /[NS]/i.test(m[4] ?? "");
  const [a, ah, b, bh] = lngFirst ? [m[3], m[4], m[1], m[2]] : [m[1], m[2], m[3], m[4]];
  const lat = signed(a, ah, "S");
  const lng = signed(b, bh, "W");
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Great-circle distance in metres. */
export function distanceBetween(a: LatLng, b: LatLng) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const DRIVING_SPEED = 13.9; // m/s, about 50 km/h

type OsrmStep = {
  distance: number;
  name: string;
  ref?: string;
  maneuver: { type: string; modifier?: string };
};

/** OSRM's maneuver (type + modifier) as one of ManeuverIcon's names. */
function maneuverOf({ type, modifier = "" }: OsrmStep["maneuver"]): string | undefined {
  const side = modifier.includes("left") ? "LEFT" : modifier.includes("right") ? "RIGHT" : null;
  if (type === "arrive") return "ARRIVE";
  if (type === "roundabout" || type === "rotary" || type === "roundabout turn") return `ROUNDABOUT_${side ?? "RIGHT"}`;
  if (type === "merge") return "MERGE";
  if (!side) return undefined; // Straight on.
  if (type === "fork") return `FORK_${side}`;
  if (type === "on ramp" || type === "off ramp") return `RAMP_${side}`;
  if (modifier === "uturn") return `UTURN_${side}`;
  if (modifier.startsWith("slight")) return `TURN_SLIGHT_${side}`;
  if (modifier.startsWith("sharp")) return `TURN_SHARP_${side}`;
  return `TURN_${side}`;
}

/** "Turn left onto Main St", in the words a driver expects. */
function instructionOf({ maneuver: { type, modifier }, name, ref }: OsrmStep): string {
  const road = name || ref || "";
  const onto = road ? ` onto ${road}` : "";
  const way = modifier && modifier !== "straight" ? modifier : "";
  switch (type) {
    case "depart":
      return road ? `Head out on ${road}` : "Head out";
    case "arrive":
      return "Arrive";
    case "merge":
      return `Merge${onto}`;
    case "on ramp":
      return `Take the ramp${onto}`;
    case "off ramp":
      return `Take the exit${onto}`;
    case "fork":
      return `Keep ${way || "straight"}${onto}`;
    case "roundabout":
    case "rotary":
      return `At the roundabout, exit${onto}`;
    case "end of road":
      return `Turn ${way}${onto}`.trim();
    default:
      if (!way) return road ? `Continue on ${road}` : "Continue";
      return modifier === "uturn" ? "Make a U-turn" : `Turn ${way}${onto}`;
  }
}

/** The driving route from `from` to `to`, with turns; a straight line when there isn't one. */
export async function routeBetween(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<Route> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  try {
    const res = await fetch(`${OSRM}${coords}?overview=full&geometries=geojson&steps=true`, { signal });
    const data: {
      code: string;
      routes?: {
        duration: number;
        distance: number;
        geometry: { coordinates: [number, number][] };
        legs: { steps: OsrmStep[] }[];
      }[];
    } = await res.json();
    const route = data.routes?.[0];
    if (data.code === "Ok" && route) {
      return {
        points: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
        // Each step starts at its maneuver, so the step lengths add up to where each turn is.
        steps: route.legs.flatMap((leg) =>
          leg.steps.map((step) => ({
            maneuver: maneuverOf(step.maneuver),
            instruction: instructionOf(step),
            distance: step.distance,
          })),
        ),
        duration: route.duration,
        distance: route.distance,
      };
    }
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  return straightLine(from, to);
}

function straightLine(from: LatLng, to: LatLng): Route {
  const distance = distanceBetween(from, to);
  return { points: [from, to], distance, duration: distance / DRIVING_SPEED, straight: true };
}
