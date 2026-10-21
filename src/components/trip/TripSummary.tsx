"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { QuestionRow, QUESTIONS_PREVIEW } from "./TripQuestions";
import { formatDuration } from "@/lib/journey/duration";
import { loadTrip, placeName, SAMPLE_TRIP, savedTripRaw, sharedMiles, tripEvents, type TripSummary as Summary } from "@/lib/trip/trip";
import { TopBar } from "../journey/TopBar";
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
  /** Where View all goes when there are more questions than the recap shows. */
  allQuestionsHref?: string;
};

/** The destination recap after End trip: the route, a short summary, the questions and the calls. */
export function TripSummary({ trip: given, doneHref = "/", allQuestionsHref = "/trip/questions" }: TripSummaryProps) {
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

  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background uppercase text-foreground">
      <TopBar />
      {trip && (
        <section aria-label="Trip summary" className="flex flex-1 flex-col px-11">
          <h1 className="mt-6 text-center text-xl">
            {trip.from || "…"} → {trip.to}
          </h1>
          <p className="mt-2 text-center text-sm text-foreground/70">
            {trip.miles.toLocaleString()} miles · {formatDuration(trip.minutes)}
          </p>

          <TripMap trip={trip} className="mt-8" />

          <div className="mt-8 space-y-2 text-sm normal-case">
            <p className={appear} style={at(0)}>
              Your road had <span className="text-marker-lime">{plural(trip.stories, "story", "stories")}</span>,{" "}
              <span className="text-marker-magenta">{plural(trip.questions.length, "question")}</span>, and{" "}
              <span className="text-marker-sky">{plural(trip.notes, "note")}</span>.
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

          {/* Past a few questions the recap shows the first ones; View all opens every one, with when it came up. */}
          <div className="mt-10 flex items-baseline justify-between">
            <h2 className="text-sm text-foreground/70">Questions on the way</h2>
            {trip.questions.length > QUESTIONS_PREVIEW && (
              <Link
                href={allQuestionsHref}
                data-cuelume-tap=""
                className="-my-3 flex min-h-11 items-center gap-1 text-sm text-foreground hover:text-foreground/70 focus-visible:outline-2 focus-visible:outline-foreground"
              >
                View all ({trip.questions.length})
                <ArrowRight size={12} aria-hidden />
              </Link>
            )}
          </div>
          {trip.questions.length ? (
            <ol className="mt-3 divide-y divide-border border-y border-border">
              {trip.questions.slice(0, QUESTIONS_PREVIEW).map((q, i) => (
                <QuestionRow key={q.id} q={q} n={i + 1} />
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

      {/* No tab bar on the recap: it ends the trip, so Done is the only way on. */}
      <div className="px-edge pb-[calc(var(--spacing-edge-bottom)+var(--safe-bottom,env(safe-area-inset-bottom)))] pt-10">
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
