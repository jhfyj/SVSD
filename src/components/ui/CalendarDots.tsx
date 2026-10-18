import { cn } from "./cn";

export type CalendarDotsProps = {
  /** Days in the month. */
  days: number;
  /** 1-based days that had a call. */
  active: number[];
  /** Weekday the month starts on, 0 = Sunday (same as `Date.getDay()`). */
  startOffset?: number;
  /** Read out to screen readers, e.g. "October 2026". */
  label?: string;
  className?: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Profile activities (Figma node 123:595): one dot per day, lit when a call happened. */
export function CalendarDots({ days, active, startOffset = 0, label, className }: CalendarDotsProps) {
  const activeSet = new Set(active);
  return (
    <div
      role="img"
      aria-label={`${label ? `${label}: ` : ""}${activeSet.size} active ${activeSet.size === 1 ? "day" : "days"}`}
      className={cn("flex w-fit flex-col gap-[7px]", className)}
    >
      <div className="grid grid-cols-[repeat(7,20px)] gap-x-4">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-center text-[11px] leading-[14px] uppercase">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(7,20px)] auto-rows-[6px] gap-x-4 gap-y-6">
        {Array.from({ length: startOffset }, (_, i) => <span key={`pad-${i}`} />)}
        {Array.from({ length: days }, (_, i) => (
          <span key={i} className="flex justify-center">
            <span className={cn("size-1.5 rounded-full", activeSet.has(i + 1) ? "bg-foreground" : "bg-foreground/15")} />
          </span>
        ))}
      </div>
    </div>
  );
}
