import { TabBar } from "@/components/ui/TabBar";
import type { PastJourney } from "@/lib/journey/history";
import { RecentJourneys } from "./RecentJourneys";
import { StartButton } from "./StartButton";
import { TopBar } from "./TopBar";

/** The first screen (iPhone 16 - 55): one big square to start setting up a trip, then your recent journeys. */
// Straight to Destination: there's no intent question before the drive. Intent is asked only
// when you flip the radio on, since it's only used to match calls.
export function StartJourney({ href = "/journey", journeys }: { href?: string; journeys?: PastJourney[] }) {
  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background text-foreground">
      <TopBar />
      {/* The title sits as close under the top bar as History's does (pt-6), not floating halfway down. */}
      <div className="flex flex-1 flex-col items-center gap-12 pb-12 pt-6">
        <StartButton href={href} />
        <RecentJourneys journeys={journeys} />
      </div>
      <TabBar current="journey" />
    </div>
  );
}
