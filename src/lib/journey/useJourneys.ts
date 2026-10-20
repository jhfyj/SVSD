"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useSession } from "../auth/session";
import { tripEvents } from "../trip/trip";
import { historyRaw, journeysToShow, loadHistory, subscribeHistory, type PastJourney } from "./history";

/**
 * The signed-in account's journeys as every screen shows them (`journeysToShow`), read after
 * hydration: undefined on the server and until the session is known, so nothing flashes first.
 */
export function useJourneys(): PastJourney[] | undefined {
  const session = useSession();
  const phone = session?.phone ?? null;
  const raw = useSyncExternalStore(subscribeHistory, () => historyRaw(phone), () => undefined);
  return useMemo(() => {
    if (raw === undefined || session === undefined) return undefined;
    return journeysToShow(loadHistory(raw));
  }, [raw, session]);
}

const dateKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * History's stats, added up from the journeys listed under them: each journey's calls are the same
 * ones its recap shows (`tripEvents`), and a day counts as active when a journey started on it.
 */
export function journeyStats(journeys: PastJourney[], now = new Date()) {
  const calls = journeys.flatMap((past) => tripEvents(past.trip).calls);
  const activeDates = [...new Set(journeys.map((past) => dateKey(past.trip.startedAt)))];
  const thisMonth = dateKey(now.getTime()).slice(0, 7);
  return {
    totalCalls: calls.length,
    callMinutes: calls.reduce((sum, call) => sum + call.minutes, 0),
    longestCall: calls.reduce((max, call) => Math.max(max, call.minutes), 0),
    activeDates,
    daysActive: activeDates.filter((d) => d.startsWith(thisMonth)).length,
  };
}
