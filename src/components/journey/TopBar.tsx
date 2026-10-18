"use client";

import { PartlyCloudyNight } from "@carbon/icons-react";
import { AccountIcon } from "../ui/icons";
import { useClock } from "./useClock";

/** The bar along the top of the setup screens: weather and LCD clock on the left, account on the right. */
export function TopBar({ showAccount = true }: { showAccount?: boolean }) {
  const time = useClock();
  return (
    <header className="flex h-14 items-center justify-between pl-4 pr-1.5">
      <div className="flex items-center gap-1 text-foreground/90">
        <PartlyCloudyNight size={16} aria-hidden />
        <time className="min-w-14 font-display text-sm">{time}</time>
      </div>
      {showAccount && (
        <button type="button" aria-label="Account" className="flex size-11 items-center justify-center">
          <AccountIcon className="size-7.5" />
        </button>
      )}
    </header>
  );
}
