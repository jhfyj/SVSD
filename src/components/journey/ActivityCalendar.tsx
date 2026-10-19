"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useState } from "react";
import { CalendarDots } from "@/components/ui/CalendarDots";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { cn } from "@/components/ui/cn";

export type ActivityCalendarProps = {
  /** Every day with a call, as "YYYY-MM-DD" (any month). */
  activeDates: string[];
  /** The month it opens on, and the latest you can go to (no future months). */
  today?: Date;
  /** How many months back you can go. */
  monthsBack?: number;
};

const monthYear = (d: Date) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
const key = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, "0")}`;

/**
 * The History tab's activities: one dot per day of a month, lit when you were on the radio.
 * The arrows step through months, back as far as `monthsBack`, forward as far as this month.
 * Six rows of space are kept for every month, so the box never jumps as you step.
 */
export function ActivityCalendar({ activeDates, today = new Date(), monthsBack = 11 }: ActivityCalendarProps) {
  const [offset, setOffset] = useState(0); // 0 = this month, -1 = last month…
  const shown = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const y = shown.getFullYear();
  const m = shown.getMonth();
  const prefix = `${key(y, m)}-`;
  const active = activeDates.filter((d) => d.startsWith(prefix)).map((d) => Number(d.slice(8, 10)));
  const days = new Date(y, m + 1, 0).getDate();
  const label = monthYear(shown);
  const canBack = offset > -monthsBack;
  const canForward = offset < 0;

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-center justify-between px-2">
        <MonthButton dir="back" disabled={!canBack} onClick={() => setOffset((o) => o - 1)} />
        <p aria-live="polite" className="text-sm uppercase">
          <ScrambleText key={label}>{label.toUpperCase()}</ScrambleText>
        </p>
        <MonthButton dir="forward" disabled={!canForward} onClick={() => setOffset((o) => o + 1)} />
      </div>
      <div className="mt-3 min-h-[179px]">
        <CalendarDots days={days} startOffset={shown.getDay()} active={active} label={label} />
      </div>
    </div>
  );
}

function MonthButton({ dir, disabled, onClick }: { dir: "back" | "forward"; disabled: boolean; onClick: () => void }) {
  const Glyph = dir === "back" ? CaretLeft : CaretRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "back" ? "Previous month" : "Next month"}
      data-cuelume-tap=""
      className={cn(
        "flex size-11 items-center justify-center transition-opacity duration-150 ease-out focus-visible:outline-2 focus-visible:outline-foreground",
        disabled ? "opacity-15" : "hover:opacity-70",
      )}
    >
      <Glyph size={16} aria-hidden />
    </button>
  );
}
