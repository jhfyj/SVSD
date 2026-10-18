import type { CallIntent } from "@/lib/radio-settings";

/*
  Picking your intent when you flip the radio on (the radio's own copy of Storybook mockup E).
  Your intent lives in the radio settings; this only remembers whether you've ever picked one,
  so the first time the radio waits for you, and after that it keeps your last pick on its own.
  Saved on this device (no backend yet).
*/

const KEY = "svsd-intent-picked";

/** You've picked an intent before, so the radio can keep it without asking. */
export function hasPickedIntent(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntentPicked() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {}
}

/** How long a remembered pick waits for a change before connecting with it. */
export const KEEP_INTENT_MS = 3000;

/** The LCD line while it searches, by your intent. */
export const LOOKING_FOR: Record<CallIntent, string> = {
  new: "Looking for someone new on your road",
  chat: "Looking for someone up for a chat",
  story: "Looking for someone swapping stories",
  chest: "Looking for someone who'll listen",
};
