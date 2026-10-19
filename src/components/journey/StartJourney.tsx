"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseCoordinates, routeBetween, searchPlaces, type Place, type Route } from "@/lib/journey/geo";
import { formatDuration } from "@/lib/journey/duration";
import { saveJourney } from "@/lib/journey/session";
import { recordJourney, type PastJourney } from "@/lib/journey/history";
import { contentFor } from "@/lib/journey/trail";
import { placeName, saveTrip } from "@/lib/trip/trip";
import { plural } from "@/lib/plural";
import { AddressList } from "../ui/AddressList";
import { ScrambleText } from "../ui/ScrambleText";
import { cn } from "../ui/cn";
import { TabBar } from "../ui/TabBar";
import { JourneyMap } from "./JourneyMap";
import { PastJourneys } from "./PastJourneys";
import { TopBar } from "./TopBar";
import { useCountUp } from "./useCountUp";
import { useCurrentLocation } from "./useCurrentLocation";

/**
 * The first screen: where you're going, and where you've been. The destination search and the
 * dotted earth sit at the top with Start journey right under them; pick a place and the earth zooms
 * into your drive. Below, your last four drives as their shapes, each remembered by a story.
 * Intent isn't asked here: it's picked when you flip the radio on, since it only matches calls.
 */
export function StartJourney({ journeys }: { journeys?: PastJourney[] }) {
  const { location, retry } = useCurrentLocation();
  const here = location.status === "ok" ? location.position : null;

  // Destination search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ query: string; places: Place[]; error?: string }>({ query: "", places: [] });
  const [destination, setDestination] = useState<Place | null>(null);
  // A past drive picked to drive again: it keeps its own route, so it works without your location.
  const [again, setAgain] = useState<PastJourney | null>(null);
  const searching = !destination && query.trim().length > 0;
  // Typed coordinates skip the address search: they're the destination as they are.
  const point = searching ? parseCoordinates(query) : null;
  const pointKey = point && `${point.lat},${point.lng}`;
  const typedPoint = point !== null;
  const [town, setTown] = useState<{ key: string; name: string } | null>(null);
  const coordinates: Place | null = point && {
    id: `pin:${pointKey}`,
    name: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
    detail: town?.key === pointKey && town.name ? town.name : "Coordinates",
    ...point,
  };

  // Name the town at typed coordinates, so the pin reads as a place (same lookup as the trip recap).
  useEffect(() => {
    if (!pointKey) return;
    const [lat, lng] = pointKey.split(",").map(Number);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      placeName({ lat, lng }, controller.signal)
        .then((name) => setTown({ key: pointKey, name }))
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pointKey]);

  useEffect(() => {
    if (!searching || typedPoint) return;
    const q = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(q, here, controller.signal)
        .then((places) => setResults({ query: q, places }))
        .catch((error: Error) => {
          if (!controller.signal.aborted) setResults({ query: q, places: [], error: error.message });
        });
    }, 150); // Just enough to skip keystrokes in a burst; Photon is a shared fair-use server.
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searching, typedPoint, query, here]);

  // The driving route from here to the destination, or the past drive's own route.
  const againRoute = again && destination?.id === again.journey.destination.id ? again.journey.route : null;
  const routeKey = destination && here && !againRoute ? `${here.lat},${here.lng}>${destination.id}` : null;
  const [route, setRoute] = useState<{ key: string; route: Route } | null>(null);
  const currentRoute = againRoute ?? (route && route.key === routeKey ? route.route : null);

  useEffect(() => {
    if (!routeKey || !destination || !here) return;
    const controller = new AbortController();
    routeBetween(here, destination, controller.signal)
      .then((r) => setRoute({ key: routeKey, route: r }))
      .catch(() => {});
    return () => controller.abort();
  }, [routeKey, destination, here]);

  // Trip length is the drive's length; every trip is a drive.
  const minutes = currentRoute ? Math.max(1, Math.round(currentRoute.duration / 60)) : 0;
  const miles = currentRoute ? Math.max(1, Math.round(currentRoute.distance / 1609.34)) : 0;
  const { stories, questions } = contentFor(minutes);
  const ready = currentRoute !== null;
  // Stories and questions count up from 0 once a route is picked.
  const shownStories = useCountUp(currentRoute ? stories : 0);
  const shownQuestions = useCountUp(currentRoute ? questions : 0);

  const pick = (place: Place) => {
    setDestination(place);
    setQuery([place.name, place.detail].filter(Boolean).join(", "));
  };
  const clear = () => {
    setDestination(null);
    setAgain(null);
    setQuery("");
  };
  const driveAgain = (past: PastJourney) => {
    setAgain(past);
    setDestination(past.journey.destination);
    setQuery(past.trip.to || past.journey.destination.name);
    // Back up to the map, where the drive draws itself in.
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  // The dropdown opens on the first keystroke. While a search runs it keeps the last places it found.
  const loading = searching && !typedPoint && results.query !== query.trim();

  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background text-foreground">
      <TopBar />
      <section aria-label="New journey" className="uppercase">
        <label htmlFor="destination" className="mx-11 mt-6 block text-center text-xl">
          <ScrambleText>Where to?</ScrambleText>
        </label>
        <div className="relative mx-11 mt-3">
          <input
            id="destination"
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            data-cuelume-type=""
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setDestination(null);
              setAgain(null);
            }}
            placeholder="Search a place or coordinates"
            className="h-12 w-full truncate rounded-token border border-border-input bg-transparent px-3 pr-11 text-base uppercase text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear destination"
              onClick={clear}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-foreground/70 hover:text-foreground"
            >
              ×
            </button>
          )}
          {/* Suggestions drop down right under the box, over the map */}
          {searching && (
            <div className="absolute inset-x-0 top-full z-20 mt-1 bg-background">
              {coordinates ? (
                <AddressList items={[coordinates]} onSelect={() => pick(coordinates)} />
              ) : results.places.length ? (
                <>
                  <AddressList items={results.places} onSelect={(item) => pick(results.places.find((p) => p.id === item.id)!)} />
                  <p className="px-3 py-1 text-right text-xs normal-case text-foreground/70">© OpenStreetMap</p>
                </>
              ) : loading ? (
                <p className="py-3 text-sm text-foreground/70">Searching…</p>
              ) : results.error ? (
                <p className="py-3 text-sm text-danger">{results.error}</p>
              ) : (
                <p className="py-3 text-sm text-foreground/70">No places match “{query.trim()}”</p>
              )}
            </div>
          )}
        </div>
        {!againRoute && <LocationNote location={location} onRetry={retry} />}

        <JourneyMap
          here={here}
          destination={destination}
          route={currentRoute?.points ?? null}
          stories={stories}
          questions={questions}
          className="mt-1"
        />

        {/* What's on the way, once there's a place; it holds two lines from then, so Start journey moves once. */}
        <p role="status" className={cn("mx-11 flex flex-col", destination && "mt-2 min-h-[30px]")}>
          {currentRoute ? (
            <>
              <span className="text-sm tabular-nums">
                <span className="text-story">{plural(shownStories, "story", "stories")}</span>{" "}
                <span className="text-question">{plural(shownQuestions, "question")}</span>
              </span>
              <span className="text-xs text-foreground/70">
                {formatDuration(minutes)} · {miles.toLocaleString()} mi
              </span>
            </>
          ) : (
            destination && <span className="text-sm text-foreground/70">{here ? "Drawing your trail…" : "Waiting for your location…"}</span>
          )}
        </p>

        <div className="mx-11 mt-3">
          <Link
            href="/journey/starting"
            data-cuelume-tap=""
            data-cuelume-theme="mech"
            // Remember the drive for the radio (arrival, and the live map's navigation) and the trip recap.
            onClick={() => {
              if (!destination || !currentRoute) return;
              saveJourney({ destination, route: currentRoute });
              const trip = {
                from: again?.trip.from ?? "",
                to: againRoute ? again!.trip.to : destination.detail.split(",")[0] || destination.name,
                route: currentRoute.points,
                minutes,
                miles,
                startedAt: Date.now(),
              };
              saveTrip(trip);
              // For Recent journeys below.
              recordJourney({ destination, route: currentRoute }, trip);
            }}
            aria-disabled={!ready}
            tabIndex={ready ? undefined : -1}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-3 bg-accent text-base text-accent-foreground transition-[opacity,background-color] duration-150 ease-out",
              "hover:bg-accent-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
              !ready && "pointer-events-none opacity-40",
            )}
          >
            Start journey
            <span aria-hidden className="size-2.5 rounded-full bg-current" />
          </Link>
        </div>
      </section>

      <PastJourneys journeys={journeys} onAgain={driveAgain} className="mt-12 flex-1 pb-12" />
      <TabBar current="journey" />
    </div>
  );
}

function LocationNote({
  location,
  onRetry,
}: {
  location: ReturnType<typeof useCurrentLocation>["location"];
  onRetry: () => void;
}) {
  if (location.status === "ok") return null;
  return (
    <p role="status" className="mx-11 mt-2 flex items-center justify-between text-xs text-foreground/70">
      {location.status === "locating" ? "Finding where you are…" : location.message}
      {location.status !== "locating" && (
        <button type="button" onClick={onRetry} className="-my-3 min-h-11 px-2 text-foreground underline">
          Try again
        </button>
      )}
    </p>
  );
}
