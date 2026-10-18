import { useEffect, useState } from "react";
import { loadTrip } from "./trip";

/**
 * True once the drive's time is up since Start journey. `forced` arrives straight away (Storybook),
 * and so does opening the radio with `?arrived` in the address, for demos (`/radio?arrived=1`).
 */
export function useArrived(forced = false) {
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    if (forced) return;
    const trip = loadTrip();
    const demo = new URLSearchParams(location.search).has("arrived");
    if (!demo && !trip?.startedAt) return;
    const left = demo || !trip ? 0 : trip.startedAt + trip.minutes * 60_000 - Date.now();
    const timer = setTimeout(() => setArrived(true), Math.max(0, left));
    return () => clearTimeout(timer);
  }, [forced]);
  return forced || arrived;
}
