"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { historyRaw, loadHistory, sampleHistory, subscribeHistory, viewJourney, type PastJourney } from "@/lib/journey/history";
import { tripStories } from "@/lib/journey/stories";
import { plural } from "@/lib/plural";
import { cn } from "../ui/cn";
import { JourneyShape } from "./JourneyShape";

export type PastJourneysProps = {
  /** The journeys to show. Leave unset to read this device's history, topped up with samples to four. */
  journeys?: PastJourney[];
  /** Drive one again: the start screen puts it back in the destination field. */
  onAgain?: (past: PastJourney) => void;
  className?: string;
};

const LIMIT = 4;
const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/**
 * The last four drives on the start screen, as their shapes: each one's trail with the stories
 * you passed lit along it, and the one worth repeating ringed and quoted underneath. Tapping a
 * drive opens its recap; the corner key puts it back in the destination field to drive again.
 */
export function PastJourneys({ journeys: given, onAgain, className }: PastJourneysProps) {
  // Read after hydration (undefined on the server) so the grid never mismatches.
  const raw = useSyncExternalStore(subscribeHistory, historyRaw, () => undefined);
  const journeys = useMemo(() => {
    if (given) return given;
    if (raw === undefined) return [];
    const saved = loadHistory(raw);
    // Until you've driven four times, sample drives fill the rest (never a place you've already been).
    const been = new Set(saved.map((past) => past.trip.to));
    return [...saved, ...sampleHistory().filter((past) => !been.has(past.trip.to))].slice(0, LIMIT);
  }, [given, raw]);

  if (!journeys.length) return null;

  return (
    <section aria-labelledby="past-journeys" className={cn("px-11", className)}>
      <h2 id="past-journeys" className="text-sm uppercase text-foreground/70">
        Recent journeys
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-6">
        {journeys.slice(0, LIMIT).map((past, i) => (
          <JourneyTile key={past.id} past={past} index={i} onAgain={onAgain} />
        ))}
      </ul>
    </section>
  );
}

function JourneyTile({ past, index, onAgain }: { past: PastJourney; index: number; onAgain?: (past: PastJourney) => void }) {
  const { stories, questions, highlight } = useMemo(() => tripStories(past.trip), [past.trip]);
  const to = past.trip.to || past.journey.destination.name;

  // The whole tile opens the recap (a stretched link), with the drive-again key sitting on top of it.
  return (
    <li className="group relative min-w-0 touch-manipulation">
      <span
        className={cn(
          "block border border-border transition-[background-color,transform] duration-75 ease-out",
          "group-has-[a:active]:translate-y-px group-has-[a:focus-visible]:outline-2 group-has-[a:focus-visible]:outline-offset-2 group-has-[a:focus-visible]:outline-foreground",
          "[@media(hover:hover)]:group-hover:bg-surface",
        )}
      >
        {/* Each shape starts a beat after the one before, so the grid fills in reading order. */}
        <JourneyShape points={past.trip.route} stories={stories} questions={questions} highlight={highlight.at} delay={120 + index * 90} />
      </span>
      <div className="mt-2 flex items-baseline justify-between gap-2 uppercase">
        <Link
          href="/trip"
          onClick={() => viewJourney(past)}
          data-cuelume-tap=""
          className="truncate text-base outline-none after:absolute after:inset-0"
        >
          {to}
        </Link>
        <span className="shrink-0 text-xs text-foreground/70">{day.format(past.trip.startedAt)}</span>
      </div>
      <div className="flex h-5 items-center justify-between">
        <span className="text-xs uppercase text-story">{plural(stories, "story", "stories")}</span>
        {onAgain && (
          <button
            type="button"
            onClick={() => onAgain(past)}
            aria-label={`Drive to ${to} again`}
            data-cuelume-tap=""
            className={cn(
              "relative z-10 -my-3 -mr-3 flex size-11 items-center justify-center text-foreground/70 transition-colors duration-150 ease-out",
              "hover:text-foreground active:translate-y-px focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-foreground",
            )}
          >
            <ArrowCounterClockwise size={16} aria-hidden />
          </button>
        )}
      </div>
      <q className="mt-1 line-clamp-3 text-sm text-foreground/70">{highlight.text}</q>
    </li>
  );
}
