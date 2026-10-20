import { SAMPLE_TRIP, saveTrip, type Trip } from "../trip/trip";
import { saveJourney, type Journey } from "./session";

/*
  Journeys you've been on, newest first, for "Recent journeys" on the start screen. No backend yet,
  so they live in localStorage on this device, one list per account (the phone number you signed
  in with): a brand-new account starts with none, even on a device someone else has driven with.
  Each keeps the destination and route (to drive it again) and the trip (to open its recap).
*/

export type PastJourney = { id: string; journey: Journey; trip: Trip };

const PREFIX = "svsd.history";
const MAX = 10;

/** Whoever is signed in on this device (read straight from the session), or null. */
function signedInPhone(): string | null {
  try {
    const raw = localStorage.getItem("svsd.session");
    return raw ? ((JSON.parse(raw) as { phone?: string }).phone ?? null) : null;
  } catch {
    return null;
  }
}

/** This account's list. Signed out shares one guest list. */
const keyFor = (phone: string | null | undefined = signedInPhone()) => `${PREFIX}.${phone || "guest"}`;

/** Stored as-is, for `useSyncExternalStore` (a string compares stably between renders). */
export function historyRaw(phone?: string | null): string | null {
  try {
    return localStorage.getItem(keyFor(phone));
  } catch {
    return null;
  }
}

export function loadHistory(raw = historyRaw()): PastJourney[] {
  try {
    const list = JSON.parse(raw || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Called when Start journey is tapped. */
export function recordJourney(journey: Journey, trip: Trip) {
  const entry: PastJourney = { id: `${trip.startedAt}`, journey, trip };
  try {
    const key = keyFor();
    localStorage.setItem(key, JSON.stringify([entry, ...loadHistory()].slice(0, MAX)));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch {
    // Storage blocked: the start screen just shows no history.
  }
}

/** Open a past journey's recap: the recap reads whichever trip is saved for this tab. */
export function viewJourney(past: PastJourney) {
  saveTrip(past.trip);
}

/** Drive the same route again, starting now. */
export function repeatJourney(past: PastJourney) {
  const trip = { ...past.trip, startedAt: Date.now() };
  saveJourney(past.journey);
  saveTrip(trip);
  recordJourney(past.journey, trip);
}

export function subscribeHistory(onChange: () => void) {
  const handler = (e: StorageEvent) => (e.key === null || e.key.startsWith(PREFIX)) && onChange();
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

const DAY = 24 * 60 * 60_000;

/** Rough drives around California, so the samples have shapes of their own. */
const SAMPLES: (Omit<Trip, "startedAt" | "route"> & { route: [number, number][]; daysAgo: number })[] = [
  { ...SAMPLE_TRIP, route: SAMPLE_TRIP.route.map(({ lat, lng }) => [lat, lng]), daysAgo: 1 },
  {
    from: "Los Angeles", to: "Joshua Tree", minutes: 140, miles: 130, daysAgo: 6,
    route: [
      [34.0522, -118.2437], [34.0686, -117.939], [34.0633, -117.6509], [34.0555, -117.1825], [33.9425, -116.9772],
      [33.9256, -116.8764], [33.92, -116.61], [34.06, -116.56], [34.12, -116.43], [34.135, -116.313],
    ],
  },
  {
    from: "San Francisco", to: "Lake Tahoe", minutes: 210, miles: 190, daysAgo: 19,
    route: [
      [37.7749, -122.4194], [37.8044, -122.2712], [38.1041, -122.2566], [38.2494, -122.04], [38.5449, -121.7405],
      [38.5816, -121.4944], [38.7521, -121.288], [38.8966, -121.0769], [39.0955, -120.9505], [39.328, -120.1833],
      [39.1677, -120.1452], [39.0968, -120.0324],
    ],
  },
  {
    from: "San Francisco", to: "Point Reyes", minutes: 75, miles: 50, daysAgo: 33,
    route: [
      [37.7749, -122.4194], [37.8078, -122.475], [37.859, -122.4852], [37.9358, -122.5311], [37.9735, -122.5611],
      [38.0085, -122.664], [38.044, -122.74], [38.069, -122.807], [38.03, -122.95], [37.9955, -123.023],
    ],
  },
];

/** A few drives around California, shown until you've been on a journey of your own. */
export function sampleHistory(now = Date.now()): PastJourney[] {
  return SAMPLES.map(({ route: pairs, daysAgo, ...trip }, i) => {
    const route = pairs.map(([lat, lng]) => ({ lat, lng }));
    const end = route[route.length - 1];
    return {
      id: `sample-${i}`,
      trip: { ...trip, route, startedAt: now - daysAgo * DAY - 2 * 60 * 60_000 },
      journey: {
        destination: { id: `sample-${i}`, name: trip.to, detail: `${trip.to}, CA`, ...end },
        route: { points: route, duration: trip.minutes * 60, distance: trip.miles * 1609.34 },
      },
    };
  });
}

/**
 * The one list every screen shows: your own drives, newest first, then the sample drives (never a
 * place you've already been). The Journey tab shows the first four of it; History shows all of it,
 * so the two always agree, and History's placeholder stats never sit over an empty list.
 */
export function journeysToShow(saved: PastJourney[], now = Date.now()): PastJourney[] {
  const been = new Set(saved.map((past) => past.trip.to));
  return [...saved, ...sampleHistory(now).filter((past) => !been.has(past.trip.to))];
}