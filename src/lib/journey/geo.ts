/*
  Address search and driving routes, from free OpenStreetMap services that need no API key:
  - Photon (photon.komoot.io) for the destination autocomplete, biased toward where you are.
  - OSRM on the FOSSGIS server (routing.openstreetmap.de) for the driving route.
  Both are shared demo servers with fair-use limits, fine for the hackathon. For production,
  swap these two functions for a keyed provider (Mapbox, Stadia, Geoapify) or a self-hosted one.
*/

export type LatLng = { lat: number; lng: number };

export type Place = LatLng & {
  id: string;
  /** The first line: house number and street, or the place's name. */
  name: string;
  /** City, state and postcode. */
  detail: string;
};

export type Route = {
  /** The path, from origin to destination. */
  points: LatLng[];
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
  const distance = distanceBetween(from, to);
  return { points: [from, to], distance, duration: distance / DRIVING_SPEED, straight: true };
}
