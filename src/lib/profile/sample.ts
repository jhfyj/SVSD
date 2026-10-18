/**
 * Placeholder profile data until calls are recorded: the Figma profile's numbers
 * (602 total calls, a few active days, two days of history).
 */
export type Journey = { id: string; startedAt: Date; minutes: number };

export function sampleProfile(now = new Date()) {
  const at = (daysAgo: number, h: number, m: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h, m);
    return d;
  };
  const history: Journey[] = [
    { id: "1", startedAt: at(0, 3, 45), minutes: 134 },
    { id: "2", startedAt: at(0, 1, 10), minutes: 48 },
    { id: "3", startedAt: at(0, 0, 5), minutes: 25 },
    { id: "4", startedAt: at(1, 22, 30), minutes: 92 },
    { id: "5", startedAt: at(1, 19, 15), minutes: 60 },
    { id: "6", startedAt: at(1, 8, 40), minutes: 210 },
    { id: "7", startedAt: at(3, 17, 0), minutes: 75 },
  ];
  return {
    totalCalls: 602,
    month: new Date(now.getFullYear(), now.getMonth(), 1),
    activeDays: [...new Set(history.filter((j) => j.startedAt.getMonth() === now.getMonth()).map((j) => j.startedAt.getDate()))],
    history,
  };
}
