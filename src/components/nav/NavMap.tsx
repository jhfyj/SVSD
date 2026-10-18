"use client";

import { Crosshair } from "@phosphor-icons/react";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { routeBetween, type LatLng, type Route } from "@/lib/journey/geo";
import { useJourney } from "@/lib/journey/session";
import { mapStyle } from "@/lib/nav/mapStyle";
import { headingAt, locate, measure, offset, pointAt, slice, type Path } from "@/lib/nav/path";
import { MapMarker, type MarkerColor } from "../ui/MapMarker";
import { cn } from "../ui/cn";
import { formatDistance, ManeuverIcon } from "./Maneuver";
import { useLivePosition } from "./useLivePosition";

/*
  The radio's map: OpenStreetMap drawn by MapLibre in our own style (see lib/nav/mapStyle), tilted
  into a 3D view with buildings, following you along the route like a navigation app. The camera
  sits behind you facing the road ahead, the route is drawn bright (grey once driven), and the
  next turn shows up top. Markers are HTML on top, so they keep their colours.
  Add ?sim to the URL (or ?sim=5 for 5x) to drive the route without moving.
*/

type MapLibre = typeof import("maplibre-gl");

/** Close in and tilted, with the camera aimed a little ahead so you sit low on the screen. */
const CAMERA = { zoom: 17, tilt: 60, ahead: 100 };
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

/** Something left on the road (a message or a question) that plays as you pass it. */
export type NavRoadMessage = {
  id: string;
  color: MarkerColor;
  label: string;
  /** Share of the way along the route, 0–1. */
  at: number;
};

export type NavMapProps = {
  travellers: NavTraveller[];
  /** Messages along the route that haven't played yet. */
  messages?: NavRoadMessage[];
  /** You've driven past a message. */
  onReach?: (id: string) => void;
  /** Shown instead of the map if the browser can't draw it (no WebGL). */
  fallback: ReactNode;
  className?: string;
};

const noSubscribe = () => () => {};

/** ?sim drives the route at 2x, ?sim=5 at 5x. */
function useSimulation() {
  const sim = useSyncExternalStore(noSubscribe, () => new URLSearchParams(location.search).get("sim"), () => null);
  return sim === null ? null : Number(sim) || 2;
}

/** The app's theme (lib/theme sets data-theme on <html>), so the map can follow day and night. */
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
function useTheme(): "dark" | "light" {
  return useSyncExternalStore<"dark" | "light">(
    subscribeTheme,
    () => (document.documentElement.dataset.theme === "light" ? "light" : "dark"),
    () => "dark",
  );
}

type Step = { along: number; maneuver?: string; instruction?: string };

/** Where each step starts along the path, scaling the route's step lengths to ours. */
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
const lngLat = (p: LatLng): [number, number] => [p.lng, p.lat];

type Progress = { along: number; at: LatLng; now: number };

export function NavMap({ travellers, messages = [], onReach, fallback, className }: NavMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [lib, setLib] = useState<MapLibre | null>(null);
  const [failed, setFailed] = useState(false);
  const theme = useTheme();
  const journey = useJourney();
  const [rerouted, setRerouted] = useState<Route | null>(null);
  const route = rerouted ?? journey?.route ?? null;
  const path = useMemo(() => (route && route.points.length > 1 ? measure(route.points) : null), [route]);
  const steps = useMemo(() => (route && path ? stepStarts(route, path) : []), [route, path]);
  const start = path?.points[0] ?? journey?.destination ?? { lat: 37.7749, lng: -122.4194 };

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
  const you = useRef<Marker | null>(null);

  // The map itself, made once. MapLibre is loaded on the client only (it needs the window).
  const firstView = useRef({ start, theme, zoomed: Boolean(path || journey) });
  useEffect(() => {
    let made: MapLibreMap | null = null;
    let cancelled = false;
    void import("maplibre-gl").then((maplibre) => {
      if (cancelled || !container.current) return;
      const { start, theme, zoomed } = firstView.current;
      // The tile worker lives in public/ (scripts/copy-map-worker.mjs); the bundler can't find it.
      maplibre.setWorkerUrl("/map/maplibre/maplibre-gl-worker.mjs");
      try {
        made = new maplibre.Map({
          container: container.current,
          style: mapStyle(theme),
          center: lngLat(start),
          zoom: zoomed ? CAMERA.zoom : 3,
          pitch: CAMERA.tilt,
          attributionControl: false,
          pitchWithRotate: false,
          touchPitch: false,
          keyboard: false,
        });
      } catch {
        setFailed(true);
        return;
      }
      // The data's credit stays on the map (the licence asks for it), folded into a small (i) that
      // opens on tap. MapLibre shows it open once the map loads; it starts folded here instead.
      made.addControl(new maplibre.AttributionControl({ compact: true }), "bottom-right");
      const fold = () => container.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      made.on("dragstart", () => {
        follow.current.on = false;
        setFollowing(false);
      });
      made.once("load", () => {
        fold();
        setLib(maplibre);
        setMap(made);
      });
    });
    return () => {
      cancelled = true;
      made?.remove();
    };
  }, []);

  // Day and night: restyle in place. The route's data is put back by the effect below.
  const styled = useRef(theme);
  const [styleVersion, setStyleVersion] = useState(0);
  useEffect(() => {
    if (!map || styled.current === theme) return;
    styled.current = theme;
    map.setStyle(mapStyle(theme));
    map.once("style.load", () => setStyleVersion((v) => v + 1));
  }, [map, theme]);

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
        you.current?.setLngLat(lngLat(shown));
        if (follow.current.on) {
          map.jumpTo({
            center: lngLat(offset(shown, heading, CAMERA.ahead)),
            bearing: heading,
            pitch: CAMERA.tilt,
            ...(follow.current.zoom && { zoom: CAMERA.zoom }),
          });
          follow.current.zoom = false;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [map, path, simulate, speed]);

  // The banner, route split and markers update a couple of times a second.
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

  // Passing a message: checked whenever your progress updates.
  const reach = useRef(onReach);
  useEffect(() => {
    reach.current = onReach;
  }, [onReach]);
  useEffect(() => {
    if (!path || !progress) return;
    for (const m of messages) if (progress.along >= m.at * path.length) reach.current?.(m.id);
  }, [path, progress, messages]);

  const recenter = () => {
    follow.current = { on: true, zoom: true };
    setFollowing(true);
  };

  const along = progress?.along ?? 0;
  const remaining = path ? Math.max(0, path.length - along) : null;
  const arrived = remaining !== null && progress !== null && remaining < ARRIVED;
  const next = steps.find((s) => s.along > along + 15);

  // The route: bright ahead of you, grey behind.
  useEffect(() => {
    const source = map?.getSource<GeoJSONSource>("route");
    if (!source || !path) return;
    const line = (part: string, points: LatLng[]) => ({
      type: "Feature" as const,
      properties: { part },
      geometry: { type: "LineString" as const, coordinates: points.map(lngLat) },
    });
    source.setData({
      type: "FeatureCollection",
      features: [line("driven", slice(path, 0, along)), line("ahead", slice(path, along, path.length))].filter(
        (f) => f.geometry.coordinates.length > 1,
      ),
    });
  }, [map, path, along, styleVersion]);

  if (failed) return fallback;

  return (
    // cn doesn't merge, so "relative" is only the default: a passed "absolute" would lose to it.
    <div className={cn(className ?? "relative", "size-full")}>
      {/* Sized, not positioned: MapLibre's stylesheet makes the map element position: relative. */}
      <div ref={container} className="nav-map size-full" />

      {map && lib && (
        <>
          {path &&
            travellers
              .filter((t) => t.ahead !== 0 && along + t.ahead > 0 && along + t.ahead < path.length)
              .map((t) => (
                <Pin key={t.id} lib={lib} map={map} at={pointAt(path, along + t.ahead)} z={5}>
                  <MapMarker color={t.color} label={t.label} className="block size-[20px]" />
                </Pin>
              ))}
          {/* Messages ahead, slightly smaller than travellers so they read as places, not people */}
          {path &&
            messages
              .filter((m) => m.at * path.length > along)
              .map((m) => (
                <Pin key={m.id} lib={lib} map={map} at={pointAt(path, m.at * path.length)} z={4}>
                  <MapMarker color={m.color} label={m.label} className="block size-[14px]" />
                </Pin>
              ))}
          {path && !arrived && (
            <Pin lib={lib} map={map} at={path.points[path.points.length - 1]} z={4}>
              <span aria-label="Destination" role="img" className="block size-3.5 rounded-full border-2 border-black bg-foreground" />
            </Pin>
          )}
          {/* You: moved every frame by the camera loop */}
          {progress && (
            <Pin lib={lib} map={map} at={progress.at} z={10} markerRef={you}>
              <MapMarker color={travellers.find((t) => t.ahead === 0)?.color ?? "lime"} label="You" className="block size-[20px]" />
            </Pin>
          )}
        </>
      )}

      {/* Next turn, like a navigation app's banner, in the radio's greys */}
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
        <span className="absolute bottom-2 left-2 bg-marker-lime px-1 font-mono text-[9px] uppercase leading-[13px] text-black">
          Demo drive
        </span>
      )}

      {!following && (
        <button
          type="button"
          onClick={recenter}
          className="absolute bottom-9 right-2 flex min-h-11 items-center gap-1.5 border border-foreground/30 bg-background/90 px-3 text-xs uppercase text-foreground"
        >
          <Crosshair size={16} aria-hidden />
          Re-centre
        </button>
      )}
    </div>
  );
}

/** React content pinned to a spot on the map (a MapLibre marker holding a portal). */
function Pin({
  lib,
  map,
  at,
  z,
  markerRef,
  children,
}: {
  lib: MapLibre;
  map: MapLibreMap;
  at: LatLng;
  z: number;
  markerRef?: React.RefObject<Marker | null>;
  children: ReactNode;
}) {
  const [element] = useState(() => {
    const el = document.createElement("div");
    el.style.zIndex = String(z);
    return el;
  });
  const marker = useRef<Marker | null>(null);
  const first = useRef(at);
  useEffect(() => {
    const m = new lib.Marker({ element }).setLngLat(lngLat(first.current)).addTo(map);
    marker.current = m;
    if (markerRef) markerRef.current = m;
    return () => {
      m.remove();
      if (markerRef) markerRef.current = null;
    };
  }, [lib, map, element, markerRef]);
  useEffect(() => {
    // "You" is moved every frame by the camera loop; this is for everything else.
    if (!markerRef) marker.current?.setLngLat(lngLat(at));
  }, [at, markerRef]);
  return createPortal(children, element);
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
