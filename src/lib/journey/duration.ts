/*
  Trip lengths the picker stops at: fine steps for short trips, coarser ones for long days out.
  5 min steps to 1 hr, 15 min steps to 3 hr, 30 min steps to 8 hr.
*/
export const DURATION_STEPS: number[] = [
  ...Array.from({ length: 12 }, (_, i) => 5 + i * 5),
  ...Array.from({ length: 8 }, (_, i) => 75 + i * 15),
  ...Array.from({ length: 10 }, (_, i) => 210 + i * 30),
];

/** The step closest to `minutes`. */
export function nearestStep(minutes: number) {
  return DURATION_STEPS.reduce((best, m) => (Math.abs(m - minutes) < Math.abs(best - minutes) ? m : best));
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
