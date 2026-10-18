"use client";

import { PartlyCloudyNight } from "@carbon/icons-react";
import Link from "next/link";
import { AccountIcon } from "../ui/icons";
import { useClock } from "./useClock";

/** The bar along the top of the setup screens: weather and LCD clock on the left, account (to /profile) on the right. */
export function TopBar({ showAccount = true }: { showAccount?: boolean }) {
  const time = useClock();
  return (
    <header className="flex h-14 items-center justify-between pl-4 pr-1.5">
      <div className="flex items-center gap-1.5 text-foreground/90">
        <PartlyCloudyNight size={20} aria-hidden />
        <time className="min-w-20 font-display text-[20px] leading-none">{time}</time>
      </div>
      {showAccount && (
        <Link href="/profile" aria-label="Profile" data-cuelume-navigate="" className="flex size-11 items-center justify-center">
          <AccountIcon className="size-7.5" />
        </Link>
      )}
    </header>
  );
}
