"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { formatDuration } from "@/lib/journey/duration";
import {
  historyRaw,
  loadHistory,
  repeatJourney,
  sampleHistory,
  subscribeHistory,
  viewJourney,
  type PastJourney,
} from "@/lib/journey/history";
import { cn } from "../ui/cn";

export type RecentJourneysProps = {
  /** The journeys to list. Leave unset to read this device's history (or a sample when it's empty). */
  journeys?: PastJourney[];
  /** How many to show. */
  limit?: number;
  className?: string;
};

const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** Under Start your journey: the last few drives, each with View (its recap) and Start again (same route). */
export function RecentJourneys({ journeys: given, limit = 3, className }: RecentJourneysProps) {
  // Read after hydration (undefined on the server) so the list never mismatches.
  const raw = useSyncExternalStore(subscribeHistory, historyRaw, () => undefined);
  const journeys = useMemo(() => {
    if (given) return given;
    if (raw === undefined) return [];
    const saved = loadHistory(raw);
    return saved.length ? saved : sampleHistory();
  }, [given, raw]);

  if (!journeys.length) return null;

  return (
    <section aria-labelledby="recent-journeys" className={cn("w-full px-[44px] uppercase", className)}>
      <h2 id="recent-journeys" className="text-sm text-foreground/70">
        Recent journeys
      </h2>
      <ul className="mt-3 divide-y divide-border border-y border-border">
        {journeys.slice(0, limit).map((past) => (
          <li key={past.id} className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-base">{past.trip.to || past.journey.destination.name}</span>
              <span className="shrink-0 text-xs text-foreground/70">{day.format(past.trip.startedAt)}</span>
            </div>
            <p className="mt-1 text-xs text-foreground/70">
              {past.trip.miles.toLocaleString()} mi · {formatDuration(past.trip.minutes)}
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                href="/trip"
                onClick={() => viewJourney(past)}
                data-cuelume-tap=""
                className="flex min-h-8 flex-1 items-center justify-center border border-foreground/40 text-xs hover:bg-surface focus-visible:bg-surface"
              >
                View journey
              </Link>
              <Link
                href="/journey/starting"
                onClick={() => repeatJourney(past)}
                data-cuelume-tap=""
                data-cuelume-theme="mech"
                className="flex min-h-8 flex-1 items-center justify-center gap-2 bg-accent text-xs text-accent-foreground hover:bg-accent-hover"
              >
                Start again
                <span aria-hidden className="size-1.5 rounded-full bg-current" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
