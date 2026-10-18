/*
  Address search and driving routes. Google Maps when it's set up (see README, "Google Maps"):
  - Places API (New) Text Search for the destination search, biased toward where you are.
  - Routes API for the driving route, with turn-by-turn steps for the radio's map.
  Both go through our own route handlers (/api/places, /api/directions), which hold the key.
  Without a key those answer 501 and we fall back to free OpenStreetMap services:
  Photon (photon.komoot.io) for search and OSRM (routing.openstreetmap.de) for routes, which
  draw the setup trail but have no turn instructions.
*/

export type LatLng = { lat: number; lng: number };

export type Place = LatLng & {
  id: string;
  /** The first line: house number and street, or the place's name. */
  name: string;
  /** City, state and postcode. */
  detail: string;
  /** Set on Google results, which need a "Google Maps" credit when shown off the map. */
  google?: true;
};

/** One turn-by-turn step, as the Routes API gives it. */
export type RouteStep = {
  /** Routes API maneuver, like TURN_LEFT or RAMP_RIGHT. */
  maneuver?: string;
  instruction?: string;
  /** Metres. */
  distance: number;
};

export type Route = {
  /** The path, from origin to destination. */
  points: LatLng[];
  /** Turn-by-turn steps; Google routes only. */
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

type GooglePlace = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location: { latitude: number; longitude: number };
};

function fromGoogle(p: GooglePlace): Place {
  const name = p.displayName?.text ?? p.formattedAddress ?? "Unknown place";
  const address = p.formattedAddress ?? "";
  const detail = address.startsWith(name) ? address.slice(name.length).replace(/^,\s*/, "") : address;
  return { id: p.id, name, detail, lat: p.location.latitude, lng: p.location.longitude, google: true };
}

/** POSTs to one of our Google route handlers; null when Google isn't set up. */
async function viaGoogle<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T | null> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  // 501: no key. 404: no route handlers (Storybook).
  if (res.status === 501 || res.status === 404) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Google request failed (${res.status})`);
  return data;
}

/** Addresses and places matching `query`, the closest to `near` first. */
export async function searchPlaces(query: string, near: LatLng | null, signal?: AbortSignal): Promise<Place[]> {
  const google = await viaGoogle<{ places?: GooglePlace[] }>("/api/places", { query, near }, signal);
  if (google) return (google.places ?? []).map(fromGoogle);

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

/** The driving route from `from` to `to`; a straight line when there isn't one. */
export async function routeBetween(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<Route> {
  try {
    const google = await viaGoogle<GoogleRoutes>("/api/directions", { from, to }, signal);
    const route = google?.routes?.[0];
    if (route) {
      return {
        points: route.polyline.geoJsonLinestring.coordinates.map(([lng, lat]) => ({ lat, lng })),
        steps: route.legs.flatMap((leg) =>
          (leg.steps ?? []).map((s) => ({
            maneuver: s.navigationInstruction?.maneuver,
            instruction: s.navigationInstruction?.instructions,
            distance: s.distanceMeters ?? 0,
          })),
        ),
        duration: parseFloat(route.duration),
        distance: route.distanceMeters,
      };
    }
    if (google) return straightLine(from, to); // Google found no driving route
  } catch (error) {
    if (signal?.aborted) throw error;
  }

  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  try {
    const res = await fetch(`${OSRM}${coords}?overview=full&geometries=geojson`, { signal });
    const data: {
      code: string;
      routes?: { duration: number; distance: number; geometry: { coordinates: [number, number][] } }[];
    } = await res.json();
    const route = data.routes?.[0];
    if (data.code === "Ok" && route) {
      return {
        points: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
        duration: route.duration,
        distance: route.distance,
      };
    }
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  return straightLine(from, to);
}

type GoogleRoutes = {
  routes?: {
    /** Like "1234s". */
    duration: string;
    distanceMeters: number;
    polyline: { geoJsonLinestring: { coordinates: [number, number][] } };
    legs: {
      steps?: {
        distanceMeters?: number;
        navigationInstruction?: { maneuver?: string; instructions?: string };
      }[];
    }[];
  }[];
};

function straightLine(from: LatLng, to: LatLng): Route {
  const distance = distanceBetween(from, to);
  return { points: [from, to], distance, duration: distance / DRIVING_SPEED, straight: true };
}
