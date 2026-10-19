import { ScrambleText } from "@/components/ui/ScrambleText";
import { ActivityCalendar } from "./ActivityCalendar";
import { TabBar } from "@/components/ui/TabBar";
import type { PastJourney } from "@/lib/journey/history";
import { sampleProfile, type Journey } from "@/lib/profile/sample";
import { RecentJourneys } from "./RecentJourneys";
import { TopBar } from "./TopBar";

export type HistoryProps = {
  /** The journeys to list. Leave unset to read the signed-in account's history on this device. */
  journeys?: PastJourney[];
  /** Calls on the radio, all time. Placeholder numbers until calls are recorded. */
  totalCalls?: number;
  /** Radio sessions, for minutes on the radio and the longest one. */
  sessions?: Journey[];
  /** Any date in the month the activities calendar shows. */
  month?: Date;
  /** 1-based days in that month with a call (the Days active stat). */
  activeDays?: number[];
  /** Every day with a call, any month, as "YYYY-MM-DD" (the activities calendar). */
  activeDates?: string[];
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
 * The History tab: your stats (total calls, minutes on the radio, longest session, days active),
 * the activities calendar, then every journey this device keeps, newest first, each with View and
 * Start again. The stats and calendar moved here from the profile.
 */
export function History({ journeys, ...given }: HistoryProps) {
  const sample = sampleProfile();
  const totalCalls = given.totalCalls ?? sample.totalCalls;
  const sessions = given.sessions ?? sample.history;
  const month = given.month ?? sample.month;
  const activeDays = given.activeDays ?? sample.activeDays;
  const activeDates = given.activeDates ?? sample.activeDates;

  const minutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const longest = sessions.reduce((max, s) => Math.max(max, s.minutes), 0);

  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background text-foreground">
      <TopBar />
      <div className="flex flex-1 flex-col pb-12 pt-6">
        <h1 className="text-center text-xl uppercase"><ScrambleText>History</ScrambleText></h1>

        <section aria-labelledby="history-stats" className="mt-12 px-11">
          <h2 id="history-stats" className="text-sm text-foreground/70">STATS</h2>
          <div className="mt-[7px] grid grid-cols-2 gap-2">
            <Stat value={totalCalls.toLocaleString()} label="TOTAL CALLS" />
            <Stat value={minutes.toLocaleString()} label="MIN ON THE RADIO" />
            <Stat value={longest ? shortDuration(longest) : "—"} label="LONGEST SESSION" />
            <Stat value={new Set(activeDays).size} label="DAYS ACTIVE" />
          </div>
        </section>

        <section aria-labelledby="history-activities" className="mt-[37px] px-11">
          <h2 id="history-activities" className="text-sm text-foreground/70">ACTIVITIES</h2>
          <div className="mt-[7px] border border-border pb-[25px] pt-2">
            <ActivityCalendar activeDates={activeDates} today={month} />
          </div>
        </section>

        <RecentJourneys
          journeys={journeys}
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
