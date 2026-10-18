import type { LatLng } from "../journey/geo";
import { contentFor } from "../journey/trail";

/*
  The trip you're on, from Start journey to End trip. There's no backend yet, so the setup screen
  saves the route here (sessionStorage) and the events along it (questions, calls) are mocked.
  Swap `tripEvents` for the real story/call log later.
*/

export type TripQuestion = {
  id: string;
  /** How far along the route it came up, 0 to 1. */
  at: number;
  text: string;
  /** The driver who left it. */
  from: string;
  near: string;
  answered: boolean;
};

export type TripCall = {
  id: string;
  /** The stranger's handle. */
  with: string;
  /** Where the call started and ended along the route, 0 to 1. */
  from: number;
  to: number;
  minutes: number;
};

export type Trip = {
  from: string;
  to: string;
  route: LatLng[];
  /** Driving time in minutes. */
  minutes: number;
  miles: number;
  /** When Start journey was tapped, ms since epoch. */
  startedAt: number;
};

export type TripSummary = Trip & { stories: number; questions: TripQuestion[]; calls: TripCall[] };

const KEY = "svsd-trip";

export function saveTrip(trip: Trip) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trip));
  } catch {}
}

/** The saved trip as stored, for `useSyncExternalStore` (a string compares stably between renders). */
export function savedTripRaw(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function loadTrip(raw = savedTripRaw()): Trip | null {
  try {
    return JSON.parse(raw || "null");
  } catch {
    return null;
  }
}

/** Questions other drivers left, from the copy doc's prompts. */
const QUESTIONS: Omit<TripQuestion, "id" | "at">[] = [
  { text: "What should the next driver know about this stretch?", from: "@Urmom2424", near: "exit 335", answered: true },
  { text: "Who are you driving home to?", from: "@Jhfnx", near: "exit 312", answered: false },
  { text: "What would you tell yourself on your first day of driving?", from: "@Hufflepuff23", near: "mile 84", answered: true },
  { text: "Where's the best coffee before the long stretch?", from: "@Nightowl88", near: "exit 74", answered: false },
  { text: "What song gets you through the last hour?", from: "@Roadrunner5", near: "exit 201", answered: false },
  { text: "Anyone else see the llama on the shoulder?", from: "@Mile84", near: "mile 84", answered: false },
];

const HANDLES = ["@Hufflepuff23", "@Nightowl88"];

/** Mocked story, question and call log for a trip, paced like the setup preview. */
export function tripEvents(trip: Trip): TripSummary {
  const { stories, questions: count } = contentFor(trip.minutes);
  const n = Math.min(QUESTIONS.length, count);
  const questions = QUESTIONS.slice(0, n).map((q, i) => ({ ...q, id: `q${i + 1}`, at: (i + 0.6) / (n + 0.2) }));
  // One call on a short drive, two on a longer one.
  const calls: TripCall[] = (trip.minutes >= 90 ? [0.15, 0.6] : [0.3]).map((start, i) => {
    const span = 0.25;
    return {
      id: `c${i + 1}`,
      with: HANDLES[i],
      from: start,
      to: start + span,
      minutes: Math.max(1, Math.round(trip.minutes * span)),
    };
  });
  return { ...trip, stories, questions, calls };
}

/** Miles of the drive a call shared. */
export const sharedMiles = (trip: Trip, call: TripCall) => Math.max(1, Math.round(trip.miles * (call.to - call.from)));

/** A drive from San Francisco to Santa Cruz, for Storybook and for opening the recap with no saved trip. */
export const SAMPLE_TRIP: Trip = {
  from: "San Francisco",
  to: "Santa Cruz",
  minutes: 78,
  miles: 75,
  startedAt: 0,
  route: [
    [37.7749, -122.4194], [37.7599, -122.4148], [37.7339, -122.4069], [37.7063, -122.4037],
    [37.6624, -122.4351], [37.6213, -122.4483], [37.5585, -122.3711], [37.5072, -122.2605],
    [37.4419, -122.1430], [37.3861, -122.0839], [37.3382, -121.8863], [37.2638, -121.9620],
    [37.2244, -121.9800], [37.1305, -121.9980], [37.0600, -122.0100], [36.9741, -122.0308],
  ].map(([lat, lng]) => ({ lat, lng })),
};

/** The town at a point, from Photon's reverse lookup (same free OpenStreetMap service as the search). */
export async function placeName({ lat, lng }: LatLng, signal?: AbortSignal): Promise<string> {
  const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=en`, { signal });
  if (!res.ok) throw new Error(`Reverse lookup failed (${res.status})`);
  const p = (await res.json()).features?.[0]?.properties ?? {};
  return p.city || p.town || p.village || p.county || p.name || "";
}
