"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { routeBetween, searchPlaces, type Place, type Route } from "@/lib/journey/geo";
import { formatDuration } from "@/lib/journey/duration";
import { contentFor } from "@/lib/journey/trail";
import { AddressList } from "../ui/AddressList";
import { cn } from "../ui/cn";
import { JourneyMap } from "./JourneyMap";
import { TopBar } from "./TopBar";
import { useCountUp } from "./useCountUp";
import { saveTrip } from "@/lib/trip/trip";
import { useCurrentLocation } from "./useCurrentLocation";

/** Destination (iPhone 16 - 50 to 58): pick where you're going; the drive sets the trip's length. */
export function JourneySetup() {
  const { location, retry } = useCurrentLocation();
  const here = location.status === "ok" ? location.position : null;

  // Destination search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ query: string; places: Place[]; error?: string }>({ query: "", places: [] });
  const [destination, setDestination] = useState<Place | null>(null);
  const searching = !destination && query.trim().length > 0;

  useEffect(() => {
    if (!searching) return;
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
  }, [searching, query, here]);

  // The driving route from here to the destination
  const routeKey = destination && here ? `${here.lat},${here.lng}>${destination.id}` : null;
  const [route, setRoute] = useState<{ key: string; route: Route } | null>(null);
  const currentRoute = route && route.key === routeKey ? route.route : null;

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
  const { stories, questions } = contentFor(minutes);
  const ready = currentRoute !== null;
  // The summary shows from the start; stories and questions count up from 0 once a route is picked.
  const shownStories = useCountUp(currentRoute ? stories : 0);
  const shownQuestions = useCountUp(currentRoute ? questions : 0);

  const pick = (place: Place) => {
    setDestination(place);
    setQuery([place.name, place.detail].filter(Boolean).join(", "));
  };
  const clear = () => {
    setDestination(null);
    setQuery("");
  };

  // The dropdown opens on the first keystroke. While a search runs it keeps the last places it found.
  const loading = searching && results.query !== query.trim();

  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background uppercase text-foreground">
      <TopBar />
      <section aria-label="Destination" className="flex flex-1 flex-col">
        {/* The prompt fades once you start typing; it stays as the field's label for screen readers. */}
        <label
          htmlFor="destination"
          className={cn("mt-6 block text-center font-mono text-base uppercase transition-opacity", query && "opacity-0")}
        >
          Enter your destination
        </label>
        <div className="relative mx-[31px] mt-4">
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
            }}
            placeholder={here ? "Search an address" : ""}
            className="h-[47px] w-full truncate rounded-token border border-foreground/60 bg-transparent px-3 pr-11 text-xl uppercase text-foreground placeholder:text-base placeholder:text-foreground/40 focus:border-foreground focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear destination"
              onClick={clear}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-foreground/60 hover:text-foreground"
            >
              ×
            </button>
          )}
          {/* Suggestions drop down right under the box */}
          {searching && (
            <div className="absolute inset-x-0 top-full z-20 mt-1 bg-background">
              {results.places.length ? (
                <AddressList items={results.places} onSelect={(item) => pick(results.places.find((p) => p.id === item.id)!)} />
              ) : loading ? (
                <p className="text-sm text-foreground/60">Searching…</p>
              ) : results.error ? (
                <p className="text-sm text-danger">{results.error}</p>
              ) : (
                <p className="text-sm text-foreground/60">No places match “{query.trim()}”</p>
              )}
            </div>
          )}
        </div>
        <LocationNote location={location} onRetry={retry} />

        <div className="relative mt-12">
          <JourneyMap
            here={here}
            destination={destination}
            route={currentRoute?.points ?? null}
            stories={stories}
            questions={questions}
          />
        </div>
        {destination && here && !currentRoute && (
          <p role="status" className="mt-4 text-center text-sm text-foreground/60">
            Drawing your trail…
          </p>
        )}
        <dl className="mx-[44px] mt-10 grid grid-cols-2 gap-y-2 text-base">
          <div>
            <dt className="sr-only">Trip</dt>
            <dd className="text-foreground/60">{formatDuration(minutes)} trip</dd>
          </div>
          <div className="text-right">
            <dt className="sr-only">Stories</dt>
            <dd className="text-marker-lime">{shownStories} stories</dd>
          </div>
          <div className="text-[10px] text-foreground/40">
            <dt className="sr-only">Distance</dt>
            <dd>
              {currentRoute ? (currentRoute.distance / 1000).toFixed(1) : "0.0"} km{" "}
              {currentRoute?.straight ? "as the crow flies" : "drive"}
            </dd>
          </div>
          <div className="text-right">
            <dt className="sr-only">Questions</dt>
            <dd className="text-marker-magenta">{shownQuestions} questions</dd>
          </div>
        </dl>
      </section>

      <div className="px-[44px] pb-14 pt-6">
        <Link
          href="/journey/starting"
          data-cuelume-navigate=""
          // Remember the drive for the radio (arrival) and the trip recap.
          onClick={() =>
            destination &&
            currentRoute &&
            saveTrip({
              from: "",
              to: destination.detail.split(",")[0] || destination.name,
              route: currentRoute.points,
              minutes,
              miles: Math.max(1, Math.round(currentRoute.distance / 1609.34)),
              startedAt: Date.now(),
            })
          }
          aria-disabled={!ready}
          tabIndex={ready ? undefined : -1}
          className={cn(
            "flex min-h-[45px] w-full items-center justify-center gap-3 bg-accent text-base text-accent-foreground transition-opacity hover:bg-accent-hover",
            !ready && "pointer-events-none opacity-30",
          )}
        >
          Start journey
          <span aria-hidden className="size-2.5 rounded-full bg-current" />
        </Link>
      </div>
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
    <p role="status" className="mx-[31px] mt-2 flex items-center justify-between text-[10px] text-foreground/60">
      {location.status === "locating" ? "Finding where you are…" : location.message}
      {location.status !== "locating" && (
        <button type="button" onClick={onRetry} className="-my-3 min-h-11 px-2 text-foreground underline">
          Try again
        </button>
      )}
    </p>
  );
}
