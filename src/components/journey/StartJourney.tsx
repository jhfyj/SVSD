import { TabBar } from "@/components/ui/TabBar";
import type { PastJourney } from "@/lib/journey/history";
import { RecentJourneys } from "./RecentJourneys";
import { StartButton } from "./StartButton";
import { TopBar } from "./TopBar";

/** The first screen (iPhone 16 - 55): one big square to start setting up a trip, then your recent journeys. */
export function StartJourney({ href = "/intents", journeys }: { href?: string; journeys?: PastJourney[] }) {
  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background text-foreground">
      <TopBar />
      <div className="flex flex-1 flex-col items-center gap-12 pb-12 pt-[96px]">
        <StartButton href={href} />
        <RecentJourneys journeys={journeys} />
      </div>
      <TabBar current="journey" />
    </div>
  );
}
