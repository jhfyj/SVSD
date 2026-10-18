/*
  Hang-up timeout: hang up on too many people in a row, in a short time, and the radio won't
  connect you to anyone for a while. Stops people "shopping" for strangers (the artifact's
  "you can leave, but you can't swap").

  Only End call counts. Stopping a search before anyone answers isn't a hang-up, and neither is
  reporting someone: you should never be punished for reporting.

  Saved on this device (no backend yet), so reloading the page doesn't reset the clock.
*/

export type HangUpRule = {
  /** This many hang-ups... */
  limit: number;
  /** ...within this window (ms)... */
  windowMs: number;
  /** ...and you can't connect for this long (ms). */
  timeoutMs: number;
};

/** 3 hang-ups within 2 minutes = 5 minutes off the air. */
export const HANG_UP_RULE: HangUpRule = { limit: 3, windowMs: 2 * 60_000, timeoutMs: 5 * 60_000 };

/** The dial kit's Hang-up timeout flow: same 3 hang-ups, but a 20-second break so it's quick to try. */
export const DEMO_HANG_UP_RULE: HangUpRule = { limit: 3, windowMs: 60_000, timeoutMs: 20_000 };

const KEY = "svsd-hangups";

type Saved = { times: number[]; until: number | null };

function read(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved && Array.isArray(saved.times)) return { times: saved.times, until: saved.until ?? null };
  } catch {}
  return { times: [], until: null };
}

function write(saved: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {}
}

/** When the current timeout ends (ms since epoch), or null if you can connect now. */
export function timedOutUntil(now = Date.now()): number | null {
  const { until } = read();
  return until && until > now ? until : null;
}

/**
 * Count a hang-up. Returns when the timeout ends if this one tipped you over, else null.
 * Hang-ups older than the window drop off, and a timeout starts the count over.
 */
export function recordHangUp(rule: HangUpRule = HANG_UP_RULE, now = Date.now()): number | null {
  const times = [...read().times.filter((t) => now - t < rule.windowMs), now];
  if (times.length >= rule.limit) {
    const until = now + rule.timeoutMs;
    write({ times: [], until });
    return until;
  }
  write({ times, until: null });
  return null;
}

/** Hang-ups left before a timeout, counting only recent ones. */
export function hangUpsLeft(rule: HangUpRule = HANG_UP_RULE, now = Date.now()): number {
  return Math.max(0, rule.limit - read().times.filter((t) => now - t < rule.windowMs).length);
}

/** Forget every hang-up and any timeout (Storybook, dev). */
export function clearHangUps() {
  write({ times: [], until: null });
}

/** "4:59" */
export const formatCountdown = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
