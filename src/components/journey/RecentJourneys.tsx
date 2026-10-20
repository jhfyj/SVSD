"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useSession } from "@/lib/auth/session";
import { formatDuration } from "@/lib/journey/duration";
import {
  historyRaw,
  journeysToShow,
  loadHistory,
  repeatJourney,
  subscribeHistory,
  viewJourney,
  type PastJourney,
} from "@/lib/journey/history";
import { cn } from "../ui/cn";

export type RecentJourneysProps = {
  /** The journeys to list. Leave unset to read the signed-in account's history on this device. */
  journeys?: PastJourney[];
  /** How many to show. */
  limit?: number;
  /** The list's heading. */
  title?: string;
  /** Under "No journeys yet" when there are none: where to start your first one. */
  emptyHint?: string;
  className?: string;
};

const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** Under Start your journey: the last few drives, each with View (its recap) and Start again (same route). */
export function RecentJourneys({
  journeys: given,
  limit = 3,
  title = "Recent journeys",
  emptyHint = "Start your first one above. It'll show up here.",
  className,
}: RecentJourneysProps) {
  // This account's list, read after hydration (undefined on the server) so it never mismatches.
  const session = useSession();
  const phone = session?.phone ?? null;
  const raw = useSyncExternalStore(subscribeHistory, () => historyRaw(phone), () => undefined);
  const journeys = useMemo(() => {
    if (given) return given;
    if (raw === undefined || session === undefined) return undefined;
    // Your drives, then the same sample drives the Journey tab shows, so the two lists match.
    return journeysToShow(loadHistory(raw));
  }, [given, raw, session]);

  // Still reading this device's storage: nothing yet, so the empty state doesn't flash first.
  if (!journeys) return null;

  // A new account: no drives yet.
  if (!journeys.length) {
    return (
      <section aria-labelledby="recent-journeys" className={cn("w-full px-11 uppercase", className)}>
        <h2 id="recent-journeys" className="text-sm text-foreground/70">
          {title}
        </h2>
        <div className="mt-3 border-y border-border py-6 text-center">
          <p className="text-base">Nothing here yet</p>
          <p className="mt-1 text-xs normal-case text-foreground/70">{emptyHint}</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="recent-journeys" className={cn("w-full px-11 uppercase", className)}>
      <h2 id="recent-journeys" className="text-sm text-foreground/70">
        {title}
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
