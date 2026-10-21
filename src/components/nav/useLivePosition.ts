"use client";

import { useEffect, useState } from "react";
import type { LatLng } from "@/lib/journey/geo";
import { DEMO_ROUTE } from "@/lib/journey/demoRoute";
import { FAKE_LOCATION } from "@/lib/prototype";

export type Fix = LatLng & {
  /** Degrees from north, when the device is moving and knows it. */
  heading: number | null;
  /** Metres. */
  accuracy: number;
};

export type LivePosition = { status: "locating" } | { status: "ok"; fix: Fix } | { status: "error"; message: string };

/** The prototype never reads your location (FAKE_LOCATION): you're parked where the script's drive starts. */
const FAKE_FIX: Fix = { ...DEMO_ROUTE.points[0], heading: null, accuracy: 10 };

/** Your position as it changes, for following you along the route. Off when `enabled` is false. */
export function useLivePosition(enabled: boolean) {
  const [state, setState] = useState<LivePosition>(FAKE_LOCATION ? { status: "ok", fix: FAKE_FIX } : { status: "locating" });

  useEffect(() => {
    if (!enabled || FAKE_LOCATION) return;
    if (!navigator.geolocation) {
      setTimeout(() => setState({ status: "error", message: "This browser can't share your location" }));
      return;
    }
    const id = navigator.geolocation.watchPosition(
      ({ coords }) =>
        setState({
          status: "ok",
          fix: {
            lat: coords.latitude,
            lng: coords.longitude,
            heading: coords.heading != null && !Number.isNaN(coords.heading) && (coords.speed ?? 0) > 1 ? coords.heading : null,
            accuracy: coords.accuracy,
          },
        }),
      (error) =>
        setState({
          status: "error",
          message: error.code === error.PERMISSION_DENIED ? "Location is off" : "Couldn't find your location",
        }),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);

  return state;
}
