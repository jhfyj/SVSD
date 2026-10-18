"use client";

import { useClock } from "./useClock";
import { WeatherIcon } from "./WeatherIcon";

/** The bar along the top of the setup screens: only the weather and the LCD clock. */
export function TopBar() {
  const time = useClock();
  return (
    <header className="flex h-14 items-center pl-4 pr-1.5">
      <div className="flex items-center gap-1.5 text-foreground">
        <WeatherIcon />
        <time className="min-w-20 font-display text-[20px] leading-none">{time}</time>
      </div>
    </header>
  );
}
