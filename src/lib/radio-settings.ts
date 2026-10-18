import { useSyncExternalStore } from "react";

/* The radio's own settings (the panel behind its Settings button). Saved on this device. */

/** What you're in the mood for (copy doc: "Laugh, Company or Something real decides what plays"). Also used to match calls. */
export type Mood = "laugh" | "company" | "real";
export const MOODS: { id: Mood; label: string }[] = [
  { id: "laugh", label: "Laugh" },
  { id: "company", label: "Company" },
  { id: "real", label: "Real" },
];

export type RadioSettings = {
  questions: boolean;
  surprises: boolean;
  /** How often the radio notifies you or starts an interaction, 1 (rarely) to 5 (often). */
  frequency: number;
  mood: Mood;
  /** Handles you've reported: never matched with them again. */
  blocked: string[];
};

const KEY = "svsd-radio-settings";
const DEFAULTS: RadioSettings = { questions: true, surprises: true, frequency: 3, mood: "company", blocked: [] };
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
