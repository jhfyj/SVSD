import { cn } from "./cn";
import { AccountIcon, CloudIcon } from "./icons";

export type StatusBarProps = { time: string; className?: string; onAccount?: () => void };

/** App header: weather icon, LCD clock, account button. */
export function StatusBar({ time, className, onAccount }: StatusBarProps) {
  return (
    <header className={cn("flex items-center justify-between px-4 py-2", className)}>
      <CloudIcon className="text-foreground/80" />
      <span className="font-display text-2xl tracking-wider">{time}</span>
      <button type="button" aria-label="Account" onClick={onAccount} className="-m-3 flex size-11 items-center justify-center">
        <AccountIcon className="size-6 text-foreground/80" />
      </button>
    </header>
  );
}
