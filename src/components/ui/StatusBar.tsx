import { UserCircle } from "@phosphor-icons/react/ssr";
import { WeatherIcon } from "../journey/WeatherIcon";
import { cn } from "./cn";

export type StatusBarProps = { time: string; className?: string; onAccount?: () => void };

/** App header: weather icon, LCD clock, account button. */
export function StatusBar({ time, className, onAccount }: StatusBarProps) {
  return (
    <header className={cn("flex items-center justify-between px-4 py-2", className)}>
      <WeatherIcon className="text-foreground/70" />
      <span className="font-display text-2xl">{time}</span>
      <button type="button" aria-label="Account" onClick={onAccount} className="-m-3 flex size-11 items-center justify-center">
        <UserCircle size={20} className="text-foreground/70" aria-hidden />
      </button>
    </header>
  );
}
