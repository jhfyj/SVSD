"use client";

import { IncidentReporter, Settings } from "@carbon/icons-react";
import { useState } from "react";
import { formatDuration } from "@/lib/journey/duration";
import type { CharacterId } from "@/lib/profile/characters";
import type { Journey } from "@/lib/profile/sample";
import { TopBar } from "../journey/TopBar";
import { CalendarDots } from "../ui/CalendarDots";
import { MenuRow } from "../ui/MenuRow";
import { StatCard } from "../ui/StatCard";
import { CharacterSprite } from "./CharacterSprite";

export type ProfileViewProps = {
  handle: string;
  /** The account's LCD pet; Freddie when left out. */
  character?: CharacterId;
  /** Tapping the avatar opens Customize profile. */
  onEditCharacter?: () => void;
  joinedAt: Date;
  totalCalls: number;
  /** Any date in the month the activities calendar shows. */
  month: Date;
  /** 1-based days in that month with a call. */
  activeDays: number[];
  history: Journey[];
  /** "Today" for grouping history; defaults to now. */
  now?: Date;
  onSettings?: () => void;
  onReport?: () => void;
  onSignOut?: () => void;
  onDeleteAccount?: () => void;
};

const monthYear = (d: Date) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
const clockTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function dayLabel(d: Date, now: Date) {
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days === 0) return "TODAY";
  if (days === 1) return "YESTERDAY";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

function groupByDay(history: Journey[], now: Date) {
  const groups: { label: string; journeys: Journey[] }[] = [];
  for (const j of [...history].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())) {
    const label = dayLabel(j.startedAt, now);
    const last = groups.at(-1);
    if (last?.label === label) last.journeys.push(j);
    else groups.push({ label, journeys: [j] });
  }
  return groups;
}

/** Past journeys (Figma node 123:550): scrolls inside its box and fades out at the bottom. */
function HistoryList({ history, now }: { history: Journey[]; now: Date }) {
  const groups = groupByDay(history, now);
  return (
    <div className="relative h-[374px] border border-muted">
      <div tabIndex={0} aria-label="Journey history" className="h-full overflow-y-auto px-[19px] pb-[84px] pt-4 focus-visible:outline-2 focus-visible:outline-foreground">
        {groups.length === 0 && <p className="pt-2 text-sm text-foreground/60">NO JOURNEYS YET</p>}
        <div className="flex flex-col gap-[23px]">
          {groups.map((g) => (
            <section key={g.label} className="flex flex-col gap-3">
              <h3 className="text-sm leading-[18px]">{g.label}</h3>
              <ul className="flex flex-col divide-y divide-foreground/15">
                {g.journeys.map((j) => (
                  <li key={j.id} className="flex items-end justify-between py-3 first:pt-0 last:pb-0">
                    <time dateTime={j.startedAt.toISOString()} className="text-sm leading-[18px] text-foreground/85">{clockTime(j.startedAt)}</time>
                    <span className="text-[10px] text-foreground/40">{formatDuration(j.minutes).toUpperCase()}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-[6px] bottom-1 h-[84px] bg-linear-to-b from-background/0 to-background" />
    </div>
  );
}

/** Profile (Figma node 123:541): avatar, stats, activity calendar, history and account actions. */
export function ProfileView({
  handle,
  character = "freddie",
  onEditCharacter,
  joinedAt,
  totalCalls,
  month,
  activeDays,
  history,
  now = new Date(),
  onSettings,
  onReport,
  onSignOut,
  onDeleteAccount,
}: ProfileViewProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  return (
    <div className="flex min-h-dvh w-full max-w-[393px] flex-col bg-background text-foreground">
      <TopBar />
      <div className="flex flex-col px-11 pb-[77px] pt-[79px]">
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={onEditCharacter}
            disabled={!onEditCharacter}
            aria-label="Change character"
            className="relative flex size-[106px] items-center justify-center overflow-hidden rounded-full bg-lcd text-lcd-ink shadow-[var(--lcd-inset)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <CharacterSprite character={character} pixel={4.4} className="opacity-80" />
          </button>
          <h1 className="mt-[18px] text-xl">{handle}</h1>
          <p className="mt-1 text-base text-foreground/50">Joined {monthYear(joinedAt)}</p>
        </div>

        <StatCard className="mt-[29px]" value={totalCalls} label="total calls" />

        <h2 className="mt-[37px] text-sm text-foreground/60">ACTIVITIES</h2>
        <div className="mt-[7px] flex min-h-[218px] justify-center border border-border pb-[31px] pt-[39px]">
          <CalendarDots days={days} startOffset={first.getDay()} active={activeDays} label={monthYear(first)} />
        </div>

        <h2 className="mt-[14px] text-sm text-foreground/60">HISTORY</h2>
        <div className="mt-[7px]">
          <HistoryList history={history} now={now} />
        </div>

        <div className="mt-[29px] flex flex-col gap-[17px]">
          <MenuRow icon={<Settings size={16} />} label="Settings" onClick={onSettings} />
          <MenuRow icon={<IncidentReporter size={16} />} label="Report" onClick={onReport} />
        </div>

        <div className="mt-[19px] flex flex-col items-start gap-2 text-xs">
          <button type="button" onClick={onSignOut} className="text-foreground/80 underline-offset-4 hover:underline">
            SIGN OUT
          </button>
          <button
            type="button"
            onClick={() => (confirmDelete ? onDeleteAccount?.() : setConfirmDelete(true))}
            onBlur={() => setConfirmDelete(false)}
            className="text-danger underline-offset-4 hover:underline"
          >
            {confirmDelete ? "TAP AGAIN TO DELETE YOUR ACCOUNT" : "DELETE ACCOUNT"}
          </button>
        </div>
      </div>
    </div>
  );
}
