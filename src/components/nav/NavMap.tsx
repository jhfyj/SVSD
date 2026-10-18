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
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { DemoDrive, Drop } from "@/lib/demo/storyDrive";
import { distanceBetween, routeBetween, type LatLng, type Route } from "@/lib/journey/geo";
import { JOURNEY_KEY, type Journey } from "@/lib/journey/session";
import { headingAt, locate, measure, offset, pointAt, slice, type Path } from "@/lib/nav/path";
import { DropMarker, DropSparkle } from "../drops/DropMarker";
import { MapMarker, type MarkerColor } from "../ui/MapMarker";
import { buildUp } from "@/lib/sound";
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

/** Metres: how close you get before a drop starts coming to you. */
const MAGNET = 60;
/** ms: how long it takes to come in, from where it waited to you; it pops as it arrives. */
const PULL_MS = 1100;
/** Travel on screen eases in and out (DESIGN.md: ease-in-out cubic): a soft start and a soft landing. */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/** Degrees a second a waiting drop turns, and how fast it whips round while it's pulled in. */
const SPIN = 140;
const SPIN_PULLED = 1100;

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
  /** A scripted drive (the demo video): its own route and speed, no location needed, drops along it. */
  demo?: DemoDrive;
  /** A drop popped as you reached it; `at` is where, in the page's px (your marker's centre). */
  onCollect?: (drop: Drop, at: { x: number; y: number }) => void;
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

/** A color token from globals.css, kept up to date with the theme. Polylines take color strings, not CSS variables. */
function useToken(name: string) {
  return useSyncExternalStore(
    subscribeTheme,
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    () => "",
  );
}
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
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

/** A drop on the map while it waits or is pulled in, updated every frame without re-rendering. */
type LiveDrop = {
  drop: Drop;
  at: LatLng;
  /** Where it was when the pull started; it travels from here to you. */
  from: LatLng;
  pulledAt: number | null;
  angle: number;
  marker: google.maps.marker.AdvancedMarkerElement | null;
  spin: HTMLDivElement | null;
  grow: HTMLDivElement | null;
};

function Navigator({ travellers, demo, onCollect, className }: Omit<NavMapProps, "fallback">) {
  const map = useMap();
  const journey = useJourney();
  const [rerouted, setRerouted] = useState<Route | null>(null);
  const route = demo?.route ?? rerouted ?? journey?.route ?? null;
  const path = useMemo(() => (route && route.points.length > 1 ? measure(route.points) : null), [route]);
  const steps = useMemo(() => (route && path ? stepStarts(route, path) : []), [route, path]);
  const routeColor = useToken("--route");
  const drivenColor = useToken("--route-driven");
  const casingColor = useToken("--route-casing");

  const simSpeed = useSimulation();
  const live = useLivePosition(simSpeed === null && !demo);
  // No location to follow (or a scripted demo): drive the route on its own so there's something to see.
  const simulate = path !== null && (!!demo || simSpeed !== null || live.status === "error");
  const speed = demo?.speed ?? SIM_SPEED * (simSpeed ?? 2);

  // Drops waiting along the road, and the sparkles left where they were picked up.
  const [waiting, setWaiting] = useState<Drop[]>(() => demo?.drops ?? []);
  const [sparkles, setSparkles] = useState<Drop[]>([]);
  const drops = useRef(new globalThis.Map<string, LiveDrop>());
  const popped = useRef(new Set<string>());
  // Each drop's marker parts check in from their ref callbacks, which run after render. A popped
  // drop never checks back in, even while React re-runs the callbacks on its way out.
  const attach = (drop: Drop, part: Partial<Pick<LiveDrop, "marker" | "spin" | "grow">>) => {
    if (popped.current.has(drop.id) || Object.values(part).every((v) => v === null)) return;
    let d = drops.current.get(drop.id);
    if (!d) {
      d = { drop, at: drop.at, from: drop.at, pulledAt: null, angle: 20, marker: null, spin: null, grow: null };
      drops.current.set(drop.id, d);
    }
    Object.assign(d, part);
  };
  const collect = useRef(onCollect);
  useEffect(() => {
    collect.current = onCollect;
  }, [onCollect]);
  const sparkled = useCallback((id: string) => setSparkles((s) => s.filter((d) => d.id !== id)), []);

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
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    // The clock starts at the first frame's own timestamp.
    let last: number | null = null;
    let shown: LatLng | null = null;
    let heading = nav.current.heading;
    const tick = (now: number) => {
      const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
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
        // Drops: each turns where it waits. Once you're close it comes to you along one eased
        // path (it follows you as you drive), hopping in an arc, spinning up and swelling,
        // with the sound building as it comes; it pops the moment it arrives.
        for (const d of drops.current.values()) {
          if (d.pulledAt === null && distanceBetween(shown, d.at) < MAGNET) {
            d.pulledAt = now;
            d.from = d.at;
            buildUp(PULL_MS);
          }
          const p = d.pulledAt === null ? 0 : Math.min(1, (now - d.pulledAt) / PULL_MS);
          const e = easeInOut(p);
          d.angle = (d.angle + (SPIN + (SPIN_PULLED - SPIN) * e) * dt) % 360;
          if (d.spin && !still) d.spin.style.transform = `rotateY(${d.angle}deg)`;
          if (d.pulledAt === null) continue;
          d.at = still ? shown : lerp(d.from, shown, e);
          if (d.marker) d.marker.position = d.at;
          d.grow?.style.setProperty("--pull", String(1 + 0.4 * e));
          d.grow?.style.setProperty("--lift", `${(-Math.sin(Math.PI * p) * 16).toFixed(1)}px`);
          if (p >= 1) {
            drops.current.delete(d.drop.id);
            popped.current.add(d.drop.id);
            const box = (you as unknown as HTMLElement | null)?.getBoundingClientRect();
            if (box) collect.current?.(d.drop, { x: box.left + box.width / 2, y: box.top + box.height / 2 });
            setWaiting((w) => w.filter((x) => x.id !== d.drop.id));
            setSparkles((s) => [...s, { ...d.drop, at: d.at }]);
          }
        }
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
        <Polyline path={ahead} strokeColor={casingColor} strokeOpacity={0.8} strokeWeight={11} zIndex={1} />
        <Polyline path={ahead} strokeColor={routeColor} strokeWeight={7} zIndex={2} />
        <Polyline path={driven} strokeColor={drivenColor} strokeWeight={6} zIndex={2} />

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
        {/* What people left along the road: pulled in and popped by the camera loop */}
        {waiting.map((drop) => (
          // Where it starts; once it's pulled in, the loop moves the marker itself.
          <AdvancedMarker
            key={drop.id}
            ref={(marker) => attach(drop, { marker })}
            position={drop.at}
            anchorLeft="-50%"
            anchorTop="-88%"
            zIndex={8}
          >
            <DropMarker kind={drop.kind} spinRef={(spin) => attach(drop, { spin })} scaleRef={(grow) => attach(drop, { grow })} />
          </AdvancedMarker>
        ))}
        {sparkles.map((drop) => (
          <AdvancedMarker key={`sparkle-${drop.id}`} position={drop.at} anchorLeft="-50%" anchorTop="-50%" zIndex={7}>
            <DropSparkle kind={drop.kind} onDone={() => sparkled(drop.id)} />
          </AdvancedMarker>
        ))}
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
                {arrived || !next ? demo?.name ?? journey?.destination.name ?? "Destination" : next.instruction ?? "Continue"}
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

      {simulate && !demo && (
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
