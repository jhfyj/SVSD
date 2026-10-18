"use client";

import { Crosshair } from "@phosphor-icons/react";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Polyline,
  useAdvancedMarkerRef,
  useMap,
} from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { routeBetween, type LatLng, type Route } from "@/lib/journey/geo";
import { JOURNEY_KEY, type Journey } from "@/lib/journey/session";
import { headingAt, locate, measure, offset, pointAt, slice, type Path } from "@/lib/nav/path";
import { MapMarker, type MarkerColor } from "../ui/MapMarker";
import { cn } from "../ui/cn";
import { formatDistance, ManeuverIcon } from "./Maneuver";
import { useLivePosition } from "./useLivePosition";

/*
  The radio's map: a Google vector map, tilted into a simple 3D view, that follows you along the
  route like Google Maps does when you're navigating. The camera sits behind you facing the road
  ahead, the route is drawn in white (grey once driven), and the next turn shows up top.
  The map's tiles are drawn in black and white (see .nav-map in globals.css); the markers keep
  their colors. Add ?sim to the URL (or ?sim=5 for 5x) to drive the route without moving.
*/

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
/** A Map ID with a vector style; Google's DEMO_MAP_ID works for development. */
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

/** Close in and tilted, with the camera aimed a little ahead so you sit low on the screen. */
const CAMERA = { zoom: 17.5, tilt: 60, ahead: 110 };
/** Demo driving speed, m/s (about 50 km/h), times the ?sim multiplier. */
const SIM_SPEED = 14;
/** Metres off the route before you count as off it, and how often to re-route at most. */
const OFF_ROUTE = 50;
const REROUTE_MS = 15000;
const ARRIVED = 30;

export type NavTraveller = {
  id: string;
  color: MarkerColor;
  label: string;
  /** Metres along the route from you: positive ahead, negative behind, 0 is you. */
  ahead: number;
};

export type NavMapProps = {
  travellers: NavTraveller[];
  /** Shown instead of the map when there's no Google Maps key (Storybook, a fresh checkout). */
  fallback: ReactNode;
  className?: string;
};

export function NavMap({ fallback, ...props }: NavMapProps) {
  if (!API_KEY) return fallback;
  return (
    <APIProvider apiKey={API_KEY}>
      <Navigator {...props} />
    </APIProvider>
  );
}

const noSubscribe = () => () => {};
const readJourney = () => {
  try {
    return sessionStorage.getItem(JOURNEY_KEY);
  } catch {
    return null;
  }
};
/** The trip from the setup screen (see saveJourney), read on the client only. */
function useJourney(): Journey | null {
  const raw = useSyncExternalStore(noSubscribe, readJourney, () => null);
  return useMemo(() => (raw ? (JSON.parse(raw) as Journey) : null), [raw]);
}

/** ?sim drives the route at 2x, ?sim=5 at 5x. */
function useSimulation() {
  const sim = useSyncExternalStore(noSubscribe, () => new URLSearchParams(location.search).get("sim"), () => null);
  return sim === null ? null : Number(sim) || 2;
}

type Step = { along: number; maneuver?: string; instruction?: string };

/** Where each step starts along the path, scaling Google's step lengths to ours. */
function stepStarts(route: Route, path: Path): Step[] {
  const steps = route.steps ?? [];
  const total = steps.reduce((sum, s) => sum + s.distance, 0) || 1;
  let along = 0;
  return steps.map((s) => {
    const step = { along: (along * path.length) / total, maneuver: s.maneuver, instruction: s.instruction };
    along += s.distance;
    return step;
  });
}

const lerp = (a: LatLng, b: LatLng, k: number) => ({ lat: a.lat + (b.lat - a.lat) * k, lng: a.lng + (b.lng - a.lng) * k });
/** Turn from `a` toward `b` the short way round. */
const turn = (a: number, b: number, k: number) => (a + ((((b - a + 540) % 360) - 180) * k) + 360) % 360;

type Progress = { along: number; at: LatLng; now: number };

function Navigator({ travellers, className }: Omit<NavMapProps, "fallback">) {
  const map = useMap();
  const journey = useJourney();
  const [rerouted, setRerouted] = useState<Route | null>(null);
  const route = rerouted ?? journey?.route ?? null;
  const path = useMemo(() => (route && route.points.length > 1 ? measure(route.points) : null), [route]);
  const steps = useMemo(() => (route && path ? stepStarts(route, path) : []), [route, path]);

  const simSpeed = useSimulation();
  const live = useLivePosition(simSpeed === null);
  // No location to follow: drive the route on its own so there's still something to see.
  const simulate = path !== null && (simSpeed !== null || live.status === "error");
  const speed = SIM_SPEED * (simSpeed ?? 2);

  // Where you are, shared with the animation loop without re-rendering every frame.
  const nav = useRef({ along: 0, target: null as LatLng | null, heading: 0, offCount: 0, lastReroute: 0 });
  const [progress, setProgress] = useState<Progress | null>(null);
  const [following, setFollowing] = useState(true);
  const follow = useRef({ on: true, zoom: true });
  const [youRef, you] = useAdvancedMarkerRef();

  // A new route starts where you are.
  useEffect(() => {
    nav.current.along = 0;
    nav.current.offCount = 0;
  }, [path]);

  // Live position: snap to the route while you're on it, re-route when you've left it.
  useEffect(() => {
    if (simulate || live.status !== "ok") return;
    const fix = live.fix;
    const n = nav.current;
    if (path) {
      const spot = locate(path, fix, n.along);
      if (spot.off < OFF_ROUTE) {
        n.along = spot.along;
        n.target = pointAt(path, spot.along);
        n.heading = headingAt(path, spot.along) ?? n.heading;
        n.offCount = 0;
      } else {
        n.target = fix;
        n.heading = fix.heading ?? n.heading;
        n.offCount++;
      }
    } else {
      n.target = fix;
      n.heading = fix.heading ?? n.heading;
    }
    const needsRoute = path ? n.offCount >= 3 : journey !== null;
    if (journey && needsRoute && Date.now() - n.lastReroute > REROUTE_MS) {
      n.lastReroute = Date.now();
      routeBetween(fix, journey.destination)
        .then((r) => !r.straight && setRerouted(r))
        .catch(() => {});
    }
  }, [live, path, simulate, journey]);

  // The camera: every frame, ease toward where you are and look down the road.
  useEffect(() => {
    if (!map) return;
    let frame = 0;
    let last = performance.now();
    let shown: LatLng | null = null;
    let heading = nav.current.heading;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const n = nav.current;
      if (simulate && path) {
        n.along = Math.min(path.length, n.along + speed * dt);
        n.target = pointAt(path, n.along);
        n.heading = headingAt(path, n.along) ?? n.heading;
      }
      if (n.target) {
        // Live fixes come about once a second; glide between them.
        shown = shown && !simulate ? lerp(shown, n.target, 1 - Math.exp(-dt / 0.4)) : n.target;
        heading = turn(heading, n.heading, 1 - Math.exp(-dt / 0.35));
        if (you) you.position = shown;
        if (follow.current.on) {
          map.moveCamera({
            center: offset(shown, heading, CAMERA.ahead),
            heading,
            tilt: CAMERA.tilt,
            ...(follow.current.zoom && { zoom: CAMERA.zoom }),
          });
          follow.current.zoom = false;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [map, you, path, simulate, speed]);

  // The banner, route split and travellers update a couple of times a second.
  useEffect(() => {
    const id = setInterval(() => {
      const { along, target } = nav.current;
      if (!target) return;
      setProgress((p) =>
        p && p.along === along && p.at.lat === target.lat && p.at.lng === target.lng ? p : { along, at: target, now: Date.now() },
      );
    }, 500);
    return () => clearInterval(id);
  }, []);

  const recenter = () => {
    follow.current = { on: true, zoom: true };
    setFollowing(true);
  };

  const along = progress?.along ?? 0;
  const remaining = path ? Math.max(0, path.length - along) : null;
  const arrived = remaining !== null && progress !== null && remaining < ARRIVED;
  const next = steps.find((s) => s.along > along + 15);
  const driven = useMemo(() => (path ? slice(path, 0, along) : []), [path, along]);
  const ahead = useMemo(() => (path ? slice(path, along, path.length) : []), [path, along]);
  const start = path?.points[0] ?? journey?.destination ?? { lat: 37.7749, lng: -122.4194 };

  return (
    // cn doesn't merge, so "relative" is only the default: a passed "absolute" would lose to it.
    <div className={cn(className ?? "relative", "size-full")}>
      <Map
        className="nav-map absolute inset-0"
        mapId={MAP_ID}
        colorScheme="DARK"
        renderingType="VECTOR"
        reuseMaps
        defaultCenter={start}
        defaultZoom={path || journey ? CAMERA.zoom : 3}
        defaultTilt={CAMERA.tilt}
        defaultHeading={0}
        disableDefaultUI
        clickableIcons={false}
        keyboardShortcuts={false}
        gestureHandling="greedy"
        onDragstart={() => {
          follow.current.on = false;
          setFollowing(false);
        }}
      >
        {/* The route: a dark casing under a white line, greyed out behind you */}
        <Polyline path={ahead} strokeColor="#000000" strokeOpacity={0.8} strokeWeight={11} zIndex={1} />
        <Polyline path={ahead} strokeColor="#ffffff" strokeWeight={7} zIndex={2} />
        <Polyline path={driven} strokeColor="#8a8a8a" strokeWeight={6} zIndex={2} />

        {path &&
          travellers
            .filter((t) => t.ahead !== 0 && along + t.ahead > 0 && along + t.ahead < path.length)
            .map((t) => (
              <AdvancedMarker key={t.id} position={pointAt(path, along + t.ahead)} anchorLeft="-50%" anchorTop="-50%" zIndex={5}>
                <MapMarker color={t.color} label={t.label} className="size-[20px]" />
              </AdvancedMarker>
            ))}
        {path && arrived === false && (
          <AdvancedMarker position={path.points[path.points.length - 1]} anchorLeft="-50%" anchorTop="-50%" zIndex={4}>
            <span aria-label="Destination" role="img" className="block size-3.5 rounded-full border-2 border-black bg-foreground" />
          </AdvancedMarker>
        )}
        {/* You: positioned every frame by the camera loop */}
        <AdvancedMarker ref={youRef} anchorLeft="-50%" anchorTop="-50%" zIndex={10}>
          {progress && <MapMarker color={travellers.find((t) => t.ahead === 0)?.color ?? "lime"} label="You" className="size-[20px]" />}
        </AdvancedMarker>
      </Map>

      {/* Next turn, like the green card in Google Maps, in the radio's greys */}
      {path && progress && (
        <div role="status" className="absolute inset-x-2 top-2 border border-foreground/20 bg-background/90 uppercase text-foreground backdrop-blur-sm">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <ManeuverIcon maneuver={arrived || !next ? "ARRIVE" : next.maneuver} />
            <div className="min-w-0">
              <p className="text-[20px] leading-tight">
                {arrived ? "Arrived" : formatDistance((next?.along ?? path.length) - along)}
              </p>
              <p className="truncate text-[11px] text-foreground/70">
                {arrived || !next ? journey?.destination.name ?? "Destination" : next.instruction ?? "Continue"}
              </p>
            </div>
          </div>
          {!arrived && remaining !== null && route && (
            <Eta remaining={remaining} length={path.length} duration={route.duration} now={progress.now} />
          )}
        </div>
      )}

      {!progress && (
        <p role="status" className="absolute inset-x-0 top-3 text-center text-[11px] uppercase text-foreground/70">
          {live.status === "error" && !path ? live.message : "Finding you…"}
        </p>
      )}

      {simulate && (
        <span className="absolute bottom-7 left-2 bg-marker-lime px-1 font-mono text-[9px] uppercase leading-[13px] text-black">
          Demo drive
        </span>
      )}

      {!following && (
        <button
          type="button"
          onClick={recenter}
          className="absolute bottom-7 right-2 flex min-h-11 items-center gap-1.5 border border-foreground/30 bg-background/90 px-3 text-xs uppercase text-foreground"
        >
          <Crosshair size={16} aria-hidden />
          Re-centre
        </button>
      )}
    </div>
  );
}

/** "12 min · 4.3 km · 3:52 AM": time left assumes the rest of the drive goes at the route's pace. */
function Eta({ remaining, length, duration, now }: { remaining: number; length: number; duration: number; now: number }) {
  const seconds = length ? (duration * remaining) / length : 0;
  const eta = new Date(now + seconds * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <p className="flex justify-between border-t border-foreground/15 px-3 py-1.5 text-[11px] text-foreground/70">
      <span>{Math.max(1, Math.round(seconds / 60))} min · {formatDistance(remaining)}</span>
      <span>ETA {eta}</span>
    </p>
  );
}
