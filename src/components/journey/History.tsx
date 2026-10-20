"use client";

import { ScrambleText } from "@/components/ui/ScrambleText";
import { ActivityCalendar } from "./ActivityCalendar";
import { TabBar } from "@/components/ui/TabBar";
import type { PastJourney } from "@/lib/journey/history";
import { journeyStats, useJourneys } from "@/lib/journey/useJourneys";
import { RecentJourneys } from "./RecentJourneys";
import { TopBar } from "./TopBar";

export type HistoryProps = {
  /** The journeys to list and count. Leave unset to read the signed-in account's (as the Journey tab shows them). */
  journeys?: PastJourney[];
  /** Today, for the calendar's month and Days active (Storybook pins it). */
  now?: Date;
};

/** "3H 30M", short enough for a half-width stat. */
function shortDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}M`;
  return m ? `${h}H ${m}M` : `${h}H`;
}

/** One stat: big number on top, small label under it (two to a row). */
function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-1 border border-border bg-surface p-3">
      <span className="text-2xl leading-8">{value}</span>
      <span className="text-xs text-foreground/70">{label}</span>
    </div>
  );
}

/**
 * The History tab: your stats, the activities calendar, then every journey, newest first, each with
 * View and Start again. Everything is added up from that same list of journeys: the calls are the
 * ones each journey's recap shows, and a day is active when a journey started on it. So the numbers
 * always match what's listed (and what the Journey tab shows).
 */
export function History({ journeys: given, now: pinned }: HistoryProps) {
  const shown = useJourneys();
  const journeys = given ?? shown ?? [];
  const now = pinned ?? new Date();
  const stats = journeyStats(journeys, now);
  // Until this device's journeys are read, the stats show a dash rather than a wrong zero.
  const ready = !!(given ?? shown);
  const show = (value: string | number) => (ready ? value : "—");

  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background text-foreground">
      <TopBar />
      <div className="flex flex-1 flex-col pb-12 pt-6">
        <h1 className="text-center text-xl uppercase"><ScrambleText>History</ScrambleText></h1>

        <section aria-labelledby="history-stats" className="mt-12 px-11">
          <h2 id="history-stats" className="text-sm text-foreground/70">STATS</h2>
          <div className="mt-[7px] grid grid-cols-2 gap-2">
            <Stat value={show(stats.totalCalls.toLocaleString())} label="TOTAL CALLS" />
            <Stat value={show(stats.callMinutes.toLocaleString())} label="MIN ON CALLS" />
            <Stat value={show(stats.longestCall ? shortDuration(stats.longestCall) : "0M")} label="LONGEST CALL" />
            <Stat value={show(stats.daysActive)} label="DAYS ACTIVE" />
          </div>
        </section>

        <section aria-labelledby="history-activities" className="mt-[37px] px-11">
          <h2 id="history-activities" className="text-sm text-foreground/70">ACTIVITIES</h2>
          <div className="mt-[7px] border border-border pb-[25px] pt-2">
            <ActivityCalendar activeDates={stats.activeDates} today={now} />
          </div>
        </section>

        <RecentJourneys
          journeys={given}
          limit={Infinity}
          title="All journeys"
          emptyHint="Start your first one from the Journey tab. It'll show up here."
          className="mt-[37px]"
        />
      </div>
      <TabBar current="history" />
    </div>
  );
}
