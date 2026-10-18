import { cn } from "./cn";

export type CalendarDotsProps = {
  /** Days in the month. */
  days: number;
  /** 1-based days that had a call. */
  active: number[];
  /** Weekday the month starts on, 0 = Monday. */
  startOffset?: number;
  className?: string;
};

/** Profile history: one dot per day, filled when a call happened. */
export function CalendarDots({ days, active, startOffset = 0, className }: CalendarDotsProps) {
  const activeSet = new Set(active);
  return (
    <div className={cn("grid grid-cols-7 gap-3", className)}>
      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
        <span key={i} className="text-center text-[10px] text-foreground/40">{d}</span>
      ))}
      {Array.from({ length: startOffset }, (_, i) => <span key={`pad-${i}`} />)}
      {Array.from({ length: days }, (_, i) => (
        <span key={i} className="flex justify-center">
          <span
            title={`Day ${i + 1}`}
            className={cn("size-2.5 rounded-full", activeSet.has(i + 1) ? "bg-lcd" : "bg-foreground/15")}
          />
        </span>
      ))}
    </div>
  );
}
