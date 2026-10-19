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

/** The San Francisco to Santa Cruz drive: a stand-in journey for Storybook and screen mockups. */
export function sampleHistory(now = Date.now()): PastJourney[] {
  const end = SAMPLE_TRIP.route[SAMPLE_TRIP.route.length - 1];
  return [
    {
      id: "sample",
      trip: { ...SAMPLE_TRIP, startedAt: now - 26 * 60 * 60_000 },
      journey: {
        destination: { id: "sample", name: "Santa Cruz", detail: "Santa Cruz, CA", ...end },
        route: { points: SAMPLE_TRIP.route, duration: SAMPLE_TRIP.minutes * 60, distance: SAMPLE_TRIP.miles * 1609.34 },
      },
    },
  ];
}
