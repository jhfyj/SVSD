import { useEffect, useState } from "react";
import { onArrival } from "./arrival";
import { loadTrip } from "./trip";

/**
 * True once the drive's time is up since Start journey. `forced` arrives straight away (Storybook),
 * and so does opening the radio with `?arrived` in the address, for demos (`/radio?arrived=1`).
 * The dial kit can also arrive or start over while the radio is open (see arrival.ts).
 */
export function useArrived(forced = false) {
  const [arrived, setArrived] = useState(false);
  // Bumped when the dial kit arrives or starts over, so the timer below re-reads the trip.
  const [restart, setRestart] = useState(0);
  useEffect(() => onArrival((now) => {
    setArrived(now);
    setRestart((n) => n + 1);
  }), []);
  useEffect(() => {
    if (forced) return;
    const trip = loadTrip();
    const demo = new URLSearchParams(location.search).has("arrived");
    if (!demo && !trip?.startedAt) return;
    const left = demo || !trip ? 0 : trip.startedAt + trip.minutes * 60_000 - Date.now();
    const timer = setTimeout(() => setArrived(true), Math.max(0, left));
    return () => clearTimeout(timer);
  }, [forced, restart]);
  return forced || arrived;
}
