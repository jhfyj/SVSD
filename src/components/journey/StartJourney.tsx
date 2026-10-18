import Link from "next/link";
import { TopBar } from "./TopBar";
import { ScrambleText } from "@/components/ui/ScrambleText";
import type { PastJourney } from "@/lib/journey/history";
import { RecentJourneys } from "./RecentJourneys";

/** The first screen (iPhone 16 - 55): one big square to start setting up a trip, then your recent journeys. */
export function StartJourney({ href = "/intents", journeys }: { href?: string; journeys?: PastJourney[] }) {
  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background text-foreground">
      <TopBar />
      <div className="flex flex-1 flex-col items-center gap-12 pb-8 pt-[96px]">
        <Link href={href} data-cuelume-tap="" data-cuelume-theme="mech" className="group flex flex-col items-center gap-[22px] uppercase">
          <span className="text-xl"><ScrambleText>Start your journey</ScrambleText></span>
          <span className="flex size-[247px] items-center justify-center border border-foreground/80 transition-colors duration-150 ease-out group-hover:bg-surface group-focus-visible:bg-surface">
            <svg aria-hidden viewBox="0 0 64 64" className="size-16 stroke-foreground" strokeWidth={3}>
              <path d="M32 16v32M16 32h32" />
            </svg>
          </span>
        </Link>
        <RecentJourneys journeys={journeys} />
      </div>
      {/* The way into /profile now that the top bar is only time and weather. */}
      <Link href="/profile" className="self-center pb-10 text-sm uppercase text-foreground/70 hover:text-foreground">
        Profile
      </Link>
    </div>
  );
}
