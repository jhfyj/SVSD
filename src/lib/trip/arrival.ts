import { loadTrip, SAMPLE_TRIP, saveTrip } from "./trip";

/*
  Where "you've arrived" comes from. For now it's the drive's time running out (useArrived), and
  the dial kit can skip to the end. To use the live map, replace `mockArrival` with one
  that watches your position against the destination and calls `announce(true)` when you get there.
*/

export type ArrivalSource = {
  /** Jump to the destination now. */
  arrive(): void;
  /** Start the drive over from the beginning. */
  reset(): void;
};

const EVENT = "svsd-arrival";

/** Tells any open radio whether you're at the destination. */
export function announce(arrived: boolean) {
  window.dispatchEvent(new CustomEvent<boolean>(EVENT, { detail: arrived }));
}

export function onArrival(listener: (arrived: boolean) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<boolean>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/** Mock: moves the saved trip's start back so its time is up (or resets it to now). */
export const mockArrival: ArrivalSource = {
  arrive() {
    const trip = loadTrip() ?? SAMPLE_TRIP;
    saveTrip({ ...trip, startedAt: Date.now() - trip.minutes * 60_000 });
    announce(true);
  },
  reset() {
    saveTrip({ ...(loadTrip() ?? SAMPLE_TRIP), startedAt: Date.now() });
    announce(false);
  },
};

export const arrival: ArrivalSource = mockArrival;
