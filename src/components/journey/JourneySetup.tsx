"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { routeBetween, searchPlaces, type Place, type Route } from "@/lib/journey/geo";
import { formatDuration, nearestStep } from "@/lib/journey/duration";
import { cue } from "@/lib/sound";
import { contentFor } from "@/lib/journey/trail";
import { AddressList } from "../ui/AddressList";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { cn } from "../ui/cn";
import { JourneyMap } from "./JourneyMap";
import { TopBar } from "./TopBar";
import { TuningStrip } from "./TuningStrip";
import { useCurrentLocation } from "./useCurrentLocation";

const TABS = ["Destination", "Duration"] as const;
type Tab = (typeof TABS)[number];

const PRESETS = [30, 60, 120, 240, 480];
const DEFAULT_MINUTES = 30;

/** Destination and Duration (iPhone 16 - 50 to 58): pick where you're going and for how long. */
export function JourneySetup({ initialTab = "Destination" }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const { location, retry } = useCurrentLocation();
  const here = location.status === "ok" ? location.position : null;

  // Destination search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ query: string; places: Place[]; error?: string }>({ query: "", places: [] });
  const [destination, setDestination] = useState<Place | null>(null);
  const searching = !destination && query.trim().length >= 3;

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
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searching, query, here]);

  // The driving route from here to the destination
  const routeKey = destination && here ? `${here.lat},${here.lng}>${destination.id}` : null;
  const [route, setRoute] = useState<{ key: string; route: Route } | null>(null);
  const currentRoute = route && route.key === routeKey ? route.route : null;

  // A soft note when the trail is ready to draw.
  useEffect(() => {
    if (currentRoute) cue("ready", { emphasis: "subtle" });
  }, [currentRoute]);

  useEffect(() => {
    if (!routeKey || !destination || !here) return;
    const controller = new AbortController();
    routeBetween(here, destination, controller.signal)
      .then((r) => setRoute({ key: routeKey, route: r }))
      .catch(() => {});
    return () => controller.abort();
  }, [routeKey, destination, here]);

  // Trip length: what you set on the Duration tab, else the drive's length.
  const [chosenMinutes, setChosenMinutes] = useState<number | null>(null);
  const routeMinutes = currentRoute ? nearestStep(currentRoute.duration / 60) : null;
  const minutes = chosenMinutes ?? routeMinutes ?? DEFAULT_MINUTES;
  const { stories, questions } = contentFor(minutes);
  const ready = destination ? currentRoute !== null : chosenMinutes !== null;

  const pick = (place: Place) => {
    setDestination(place);
    setQuery([place.name, place.detail].filter(Boolean).join(", "));
  };
  const clear = () => {
    setDestination(null);
    setQuery("");
  };

  const shownResults = searching && results.query === query.trim() ? results : null;

  return (
    <div className="rain flex min-h-dvh w-full max-w-[393px] flex-col bg-background uppercase text-foreground">
      <TopBar />
      <div className="px-9 pt-4">
        <SegmentedTabs label="Trip setup" options={TABS} value={tab} onChange={setTab} className="p-2 [&>button]:text-xl" />
      </div>

      {tab === "Destination" ? (
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
                data-cuelume-close=""
                data-cuelume-emphasis="subtle"
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-foreground/60 hover:text-foreground"
              >
                ×
              </button>
            )}
            {/* Suggestions drop down right under the box */}
            {shownResults && (
              <div className="absolute inset-x-0 top-full z-20 mt-1 bg-background">
                {shownResults.error ? (
                  <p className="text-sm text-danger">{shownResults.error}</p>
                ) : shownResults.places.length ? (
                  <AddressList
                    items={shownResults.places}
                    onSelect={(item) => pick(shownResults.places.find((p) => p.id === item.id)!)}
                  />
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
          {currentRoute && (
            <dl className="mx-[44px] mt-10 grid grid-cols-2 gap-y-2 text-base motion-safe:animate-[trail-in_400ms_ease-out_1.6s_both]">
              <div>
                <dt className="sr-only">Trip</dt>
                <dd className="text-foreground/60">{formatDuration(minutes)} trip</dd>
              </div>
              <div className="text-right">
                <dt className="sr-only">Stories</dt>
                <dd className="text-marker-lime">{stories} stories</dd>
              </div>
              <div className="text-[10px] text-foreground/40">
                <dt className="sr-only">Distance</dt>
                <dd>
                  {(currentRoute.distance / 1000).toFixed(1)} km {currentRoute.straight ? "as the crow flies" : "drive"}
                </dd>
              </div>
              <div className="text-right">
                <dt className="sr-only">Questions</dt>
                <dd className="text-marker-magenta">{questions} questions</dd>
              </div>
            </dl>
          )}
        </section>
      ) : (
        <section aria-label="Duration" className="flex flex-1 flex-col items-center px-9">
          <p className="mt-8 text-center font-mono text-base uppercase">How long’s your trip</p>
          <TuningStrip minutes={minutes} onChange={setChosenMinutes} className="-mx-9 mt-12 w-[calc(100%+4.5rem)]" />
          <div role="group" aria-label="Quick picks" className="mt-12 flex w-full flex-wrap justify-center gap-2">
            {routeMinutes !== null && (
              <Chip selected={minutes === routeMinutes} onClick={() => setChosenMinutes(null)}>
                Drive · {formatDuration(routeMinutes)}
              </Chip>
            )}
            {PRESETS.map((m) => (
              <Chip key={m} selected={chosenMinutes === m} onClick={() => setChosenMinutes(m)}>
                {formatDuration(m)}
              </Chip>
            ))}
          </div>
          <p className="mt-6 text-center text-[10px] text-foreground/60">
            About {stories} stories and {questions} questions
          </p>
        </section>
      )}

      <div className="px-[44px] pb-14 pt-6">
        <Link
          href="/journey/starting"
          data-cuelume-navigate=""
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

function Chip({ selected, children, onClick }: { selected: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      data-cuelume-select=""
      className={cn(
        "min-h-11 border px-3 text-xs uppercase transition-colors",
        selected ? "border-foreground bg-surface-raised text-foreground" : "border-border text-foreground/60 hover:text-foreground",
      )}
    >
      {children}
    </button>
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
        <button type="button" onClick={onRetry} data-cuelume-tap="" className="-my-3 min-h-11 px-2 text-foreground underline">
          Try again
        </button>
      )}
    </p>
  );
}
