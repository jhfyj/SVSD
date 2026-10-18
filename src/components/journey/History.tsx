import { ScrambleText } from "@/components/ui/ScrambleText";
import { TabBar } from "@/components/ui/TabBar";
import type { PastJourney } from "@/lib/journey/history";
import { RecentJourneys } from "./RecentJourneys";
import { TopBar } from "./TopBar";

/** The History tab: every journey this device keeps, newest first, each with View and Start again. */
export function History({ journeys }: { journeys?: PastJourney[] }) {
  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background text-foreground">
      <TopBar />
      <div className="flex flex-1 flex-col gap-12 pb-12 pt-6">
        <h1 className="text-center text-xl uppercase"><ScrambleText>History</ScrambleText></h1>
        <RecentJourneys journeys={journeys} limit={Infinity} />
      </div>
      <TabBar current="history" />
    </div>
  );
}
