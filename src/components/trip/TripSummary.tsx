"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { formatDuration } from "@/lib/journey/duration";
import { loadTrip, placeName, SAMPLE_TRIP, savedTripRaw, sharedMiles, tripEvents, type TripSummary as Summary } from "@/lib/trip/trip";
import { TopBar } from "../journey/TopBar";
import { cn } from "../ui/cn";
import { TripMap } from "./TripMap";
import { plural } from "@/lib/plural";

const noop = () => () => {};

/** Each line of the recap appears on its own frame, one after another. */
const appear = "motion-safe:animate-[trail-in_1ms_steps(1)_both]";
const at = (step: number) => ({ animationDelay: `${600 + step * 250}ms` });

export type TripSummaryProps = {
  /** The trip to show. Leave unset to read the trip you just drove (or a sample when there is none). */
  trip?: Summary;
  doneHref?: string;
};

/** The destination recap after End trip: the route, a short summary, the questions and the calls. */
export function TripSummary({ trip: given, doneHref = "/" }: TripSummaryProps) {
  // The trip you just drove, read after hydration (undefined on the server).
  const raw = useSyncExternalStore(noop, savedTripRaw, () => undefined);
  const saved = useMemo(() => (raw === undefined ? null : tripEvents(loadTrip(raw) ?? SAMPLE_TRIP)), [raw]);

  // A saved trip only knows where it started as a point; name the town once the recap opens.
  const [from, setFrom] = useState<string | null>(null);
  const unnamed = saved && !saved.from ? saved.route[0] : null;
  useEffect(() => {
    if (!unnamed) return;
    const controller = new AbortController();
    placeName(unnamed, controller.signal)
      .then((name) => setFrom(name || "Start"))
      .catch(() => !controller.signal.aborted && setFrom("Start"));
    return () => controller.abort();
  }, [unnamed]);

  const trip = given ?? (saved && { ...saved, from: saved.from || from || "" });

  const answered = trip?.questions.filter((q) => q.answered).length ?? 0;

  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background uppercase text-foreground">
      <TopBar />
      {trip && (
        <section aria-label="Trip summary" className="flex flex-1 flex-col px-[31px]">
          <h1 className="mt-6 text-center text-xl">
            {trip.from || "…"} → {trip.to}
          </h1>
          <p className="mt-2 text-center text-sm text-foreground/70">
            {trip.miles.toLocaleString()} miles · {formatDuration(trip.minutes)}
          </p>

          <TripMap trip={trip} className="mt-8" />

          <div className="mt-8 space-y-2 text-sm normal-case">
            <p className={appear} style={at(0)}>
              You passed <span className="text-marker-lime">{plural(trip.stories, "story", "stories")}</span> and answered{" "}
              <span className="text-marker-magenta">
                {plural(answered, "question")}
              </span>
              .
            </p>
            {trip.calls.length ? (
              trip.calls.map((call, i) => (
                <p key={call.id} className={appear} style={at(1 + i)}>
                  You shared <span className="text-marker-sky">{sharedMiles(trip, call)} miles</span> with {call.with}.
                </p>
              ))
            ) : (
              <p className={appear} style={at(1)}>
                No calls this trip.
              </p>
            )}
          </div>

          <h2 className="mt-10 text-sm text-foreground/70">Questions on the way</h2>
          {trip.questions.length ? (
            <ol className="mt-3 divide-y divide-border border-y border-border">
              {trip.questions.map((q, i) => (
                <li key={q.id} className="flex gap-3 py-3">
                  <span
                    aria-hidden
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center border-2 border-marker-border bg-marker-magenta text-xs text-black"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm normal-case">{q.text}</p>
                    <p className="mt-1 text-xs text-foreground/70">
                      {q.from} · near {q.near} · <span className={cn(!q.answered && "text-foreground/40")}>{q.answered ? "Answered" : "Not answered"}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-foreground/70">No questions came up.</p>
          )}

          <h2 className="mt-8 text-sm text-foreground/70">Calls</h2>
          {trip.calls.length ? (
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {trip.calls.map((call) => (
                <li key={call.id} className="flex items-center gap-3 py-3">
                  <span aria-hidden className="size-3 shrink-0 rounded-full bg-marker-sky" />
                  <span className="flex-1 text-sm normal-case">{call.with}</span>
                  <span className="text-xs text-foreground/70">
                    {sharedMiles(trip, call)} mi · {formatDuration(call.minutes)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-foreground/70">You didn&apos;t take any calls.</p>
          )}
        </section>
      )}

      <div className="px-[44px] pb-14 pt-10">
        <Link
          href={doneHref}
          data-cuelume-tap=""
          className="flex min-h-[45px] w-full items-center justify-center gap-3 bg-accent text-base text-accent-foreground hover:bg-accent-hover"
        >
          Done
          <span aria-hidden className="size-2.5 rounded-full bg-current" />
        </Link>
      </div>
    </div>
  );
}
