import type { Place, Route } from "./geo";

/*
  The trip you set up, handed from the setup screen to the radio. Kept in sessionStorage so a
  reload of the radio keeps navigating; it's gone when the tab closes.
*/

export type Journey = { destination: Place; route: Route | null };

export const JOURNEY_KEY = "svsd.journey";

export function saveJourney(journey: Journey | null) {
  try {
    if (journey) sessionStorage.setItem(JOURNEY_KEY, JSON.stringify(journey));
    else sessionStorage.removeItem(JOURNEY_KEY);
  } catch {
    // Private mode or storage blocked: the radio just opens without a route.
  }
}

