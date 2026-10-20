"use client";

import { useCallback, useEffect, useState } from "react";
import type { LatLng } from "@/lib/journey/geo";
import { rememberPlace } from "@/lib/theme";
import { guideActive } from "@/lib/guide";
import { DEMO_ROUTE } from "@/lib/journey/demoRoute";

export type LocationState =
  | { status: "locating" }
  | { status: "ok"; position: LatLng }
  | { status: "denied" | "unavailable"; message: string };

/** Where you are now, from the browser. Needs https (or localhost) and the visitor's permission. */
export function useCurrentLocation() {
  const [state, setState] = useState<LocationState>({ status: "locating" });

  const request = useCallback(() => {
    // The guided demo on the submission site: never ask a visitor for their location. They start
    // where the script's drive does, Santa Monica, so Flow 2 draws an LA trail.
    if (guideActive()) {
      setTimeout(() => setState({ status: "ok", position: DEMO_ROUTE.points[0] }));
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setTimeout(() => setState({ status: "unavailable", message: "This browser can't share your location" }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setState({ status: "ok", position: { lat: coords.latitude, lng: coords.longitude } });
        // Lets day and night follow your sunrise and sunset.
        rememberPlace(coords.latitude, coords.longitude);
      },
      (error) =>
        setState(
          error.code === error.PERMISSION_DENIED
            ? { status: "denied", message: "Allow location to draw your trail" }
            : { status: "unavailable", message: "Couldn't find your location" },
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }, []);

  useEffect(request, [request]);

  const retry = useCallback(() => {
    setState({ status: "locating" });
    request();
  }, [request]);

  return { location: state, retry };
}
