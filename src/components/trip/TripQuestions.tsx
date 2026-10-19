"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { loadTrip, SAMPLE_TRIP, savedTripRaw, tripEvents, type TripQuestion, type TripSummary } from "@/lib/trip/trip";
import { TopBar } from "../journey/TopBar";
import { cn } from "../ui/cn";

const noop = () => () => {};

/** More questions than this and the recap shows the first few, with View all opening the full list. */
export const QUESTIONS_PREVIEW = 3;

const clockTime = (ms: number) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/**
 * When a question came up: the clock time, worked out from when the trip started and how far
 * along the route it was. A trip with no start time (the sample) gives how far into the drive.
 */
export function questionTime(trip: TripSummary, q: TripQuestion): { clock: string | null; into: string } {
  const minutesIn = Math.round(trip.minutes * q.at);
  const into = minutesIn >= 60 ? `${Math.floor(minutesIn / 60)} hr ${minutesIn % 60} min in` : `${minutesIn} min in`;
  return { clock: trip.startedAt ? clockTime(trip.startedAt + minutesIn * 60_000) : null, into };
}

/** One question: its number (as on the map), what was asked, who asked, where, and whether you answered. */
export function QuestionRow({ q, n, time }: { q: TripQuestion; n: number; time?: { clock: string | null; into: string } }) {
  return (
    <li className="flex gap-3 py-3">
      <span
        aria-hidden
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center border-2 border-marker-border bg-marker-magenta text-xs text-black"
      >
        {n}
      </span>
      <div className="min-w-0 flex-1">
        {/* When it came up sits above the question, so the question keeps the full width. */}
        {time && (
          <p className="mb-1 text-xs text-foreground/70">
            {time.clock && <span className="text-foreground">{time.clock} · </span>}
            {time.into}
          </p>
        )}
        <p className="text-sm normal-case">{q.text}</p>
        <p className="mt-1 text-xs text-foreground/70">
          {q.from} · near {q.near} ·{" "}
          <span className={cn(!q.answered && "text-foreground/40")}>{q.answered ? "Answered" : "Not answered"}</span>
        </p>
      </div>
    </li>
  );
}

export type TripQuestionsProps = {
  /** The trip to list. Leave unset to read the trip you just drove (or the sample when there is none). */
  trip?: TripSummary;
  backHref?: string;
};

/** Every question from the trip, in the order they came up, with when each one did. View all on the recap opens it. */
export function TripQuestions({ trip: given, backHref = "/trip" }: TripQuestionsProps) {
  const raw = useSyncExternalStore(noop, savedTripRaw, () => undefined);
  const saved = useMemo(() => (raw === undefined ? null : tripEvents(loadTrip(raw) ?? SAMPLE_TRIP)), [raw]);
  const trip = given ?? saved;
  const answered = trip?.questions.filter((q) => q.answered).length ?? 0;

  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background uppercase text-foreground">
      <TopBar />
      <header className="relative mt-6 flex h-[26px] items-center justify-center">
        <Link
          href={backHref}
          aria-label="Back to your trip"
          className="absolute left-[13px] flex size-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-foreground"
        >
          <ArrowLeft size={16} aria-hidden />
        </Link>
        <h1 className="text-xl">Questions on the way</h1>
      </header>
      {trip && (
        <section aria-label="All questions" className="flex flex-1 flex-col px-11 pb-edge-bottom">
          <p className="mt-2 text-center text-sm text-foreground/70">
            {trip.questions.length} asked · {answered} answered
          </p>
          {trip.questions.length ? (
            <ol className="mt-8 divide-y divide-border border-y border-border">
              {trip.questions.map((q, i) => (
                <QuestionRow key={q.id} q={q} n={i + 1} time={questionTime(trip, q)} />
              ))}
            </ol>
          ) : (
            <p className="mt-8 text-sm text-foreground/70">No questions came up.</p>
          )}
        </section>
      )}
    </div>
  );
}
