import { useSyncExternalStore } from "react";

/* The radio's own settings (the panel behind its Settings button). Saved on this device. */

/**
 * What you're on the radio for. With shared stretch of road, it's what matches you with someone.
 * The team's four intents, which line up with the artifact's moods (Company, Laugh, Something real)
 * and "stories told together". `key` is the short label that fits a key; `label` is the full wording.
 */
export type CallIntent = "new" | "chat" | "story" | "chest";
export const CALL_INTENTS: { id: CallIntent; key: string; label: string }[] = [
  { id: "new", key: "Meet someone", label: "Connect with someone new" },
  { id: "chat", key: "Chit-chat", label: "Just here to chit-chat" },
  { id: "story", key: "Share a story", label: "Share a story" },
  { id: "chest", key: "Off my chest", label: "Get something off my chest" },
];

/**
 * Who each intent can be paired with, best first; ties go to whoever shares the most road.
 * Off my chest never pairs with another venter, only a listener (Meet someone, Share a story),
 * and Chit-chat stays light, so it's never handed a heavy call.
 */
export const PAIRS_WITH: Record<CallIntent, CallIntent[]> = {
  new: ["new", "story", "chest"],
  chat: ["chat", "new"],
  story: ["story", "new", "chest"],
  chest: ["new", "story"],
};

export type RadioSettings = {
  questions: boolean;
  surprises: boolean;
  /** How often the radio notifies you or starts an interaction, 1 (rarely) to 5 (often). */
  frequency: number;
  /** Your intent for the next match. Changing it mid-call doesn't end the call. */
  intent: CallIntent;
  /** Handles you've reported: never matched with them again. */
  blocked: string[];
};

const KEY = "svsd-radio-settings";
const DEFAULTS: RadioSettings = { questions: true, surprises: true, frequency: 3, intent: "new", blocked: [] };
const listeners = new Set<() => void>();
let cached: RadioSettings | null = null;

function read(): RadioSettings {
  if (cached) return cached;
  try {
    cached = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    cached = DEFAULTS;
  }
  return cached!;
}

export function saveRadioSettings(patch: Partial<RadioSettings>) {
  cached = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {}
  listeners.forEach((l) => l());
}

/** Report someone: they're added to your blocked list (mocked until there's a backend to send reports to). */
export function blockHandle(handle: string) {
  const { blocked } = read();
  if (!blocked.includes(handle)) saveRadioSettings({ blocked: [...blocked, handle] });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useRadioSettings() {
  return useSyncExternalStore(subscribe, read, () => DEFAULTS);
}
