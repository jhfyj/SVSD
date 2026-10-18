import { bind, play, setEnabled, type PlayOptions, type SoundName } from "cuelume";
import { useSyncExternalStore } from "react";

/*
  Every sound in the app goes through here, so one switch silences all of it.

  Two ways to make a control sound:
  - Mark it with a cuelume attribute and the global binding plays it:
    data-cuelume-tap, -select, -toggle, -open, -close, -type (Jennifer dislikes the
    -navigate whoosh on buttons; buttons that move to the next screen use a mech tap)
    (set the value to another cue name, e.g. data-cuelume-tap="close").
  - Call cue() from code for anything that isn't a plain click: outcomes, the radio switch,
    the tuning strip's detents, the load-in.

  Outside the radio, keep sound for major moments only (the main call to action on a screen,
  sign-in results, saving, deleting) and typing; Jennifer found more than that too busy. Everything on the
  radio sounds.

  Radio hardware uses the "mech" theme (clicks, latches, ratchets); the rest of the app uses the
  warm default. Browsers keep audio silent until the first tap, and cuelume waits for it.
*/

export type { SoundName };

const KEY = "svsd-sound";
const listeners = new Set<() => void>();

function stored(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

let on = true;

/** Play one cue now. Silent while sound is off. */
export function cue(name: SoundName, options?: PlayOptions) {
  play(name, options);
}

export function isSoundOn() {
  return on;
}

/** The global mute. Remembered on this device. */
export function setSoundOn(next: boolean) {
  on = next;
  setEnabled(next);
  try {
    localStorage.setItem(KEY, next ? "on" : "off");
  } catch {}
  listeners.forEach((l) => l());
}

/** Wire up the data-cuelume-* attributes and apply the saved mute. Returns the unbind. */
export function startSound() {
  on = stored();
  setEnabled(on);
  listeners.forEach((l) => l());
  return bind();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Whether sound is on, for a toggle that shows it. */
export function useSoundOn() {
  return useSyncExternalStore(subscribe, isSoundOn, () => true);
}
