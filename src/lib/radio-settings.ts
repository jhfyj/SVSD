import { useSyncExternalStore } from "react";

/* The radio's own settings (the panel behind its Settings button). Saved on this device. */

export type RadioSettings = {
  questions: boolean;
  surprises: boolean;
  /** How often the radio notifies you or starts an interaction, 1 (rarely) to 5 (often). */
  frequency: number;
};

const KEY = "svsd-radio-settings";
const DEFAULTS: RadioSettings = { questions: true, surprises: true, frequency: 3 };
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

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useRadioSettings() {
  return useSyncExternalStore(subscribe, read, () => DEFAULTS);
}
