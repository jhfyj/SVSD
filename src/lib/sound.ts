import { bind, play, setEnabled, unlock, type PlayOptions, type SoundName } from "cuelume";
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
  // Chrome's autofill sends a keydown with no `key`, and cuelume's typing sound reads
  // `event.key.length`, which throws. Stop those on the window, before cuelume sees them.
  const dropKeyless = (e: KeyboardEvent) => {
    if (typeof e.key !== "string") e.stopImmediatePropagation();
  };
  window.addEventListener("keydown", dropKeyless, true);
  const unbind = bind();
  // Unlock during the real user gesture so delayed radio load-in cues can sound reliably.
  const unlockOnGesture = () => {
    if (on) void unlock();
  };
  document.addEventListener("pointerdown", unlockOnGesture, true);
  document.addEventListener("keydown", unlockOnGesture, true);
  return () => {
    unbind();
    window.removeEventListener("keydown", dropKeyless, true);
    document.removeEventListener("pointerdown", unlockOnGesture, true);
    document.removeEventListener("keydown", unlockOnGesture, true);
  };
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Whether sound is on, for a toggle that shows it. */
export function useSoundOn() {
  return useSyncExternalStore(subscribe, isSoundOn, () => true);
}

/*
  Two sounds cuelume doesn't have, for collecting a drop on the road. They're synthesised with
  Web Audio, but still go through here so the one mute silences them too.
*/
let context: AudioContext | null = null;
function audio(): AudioContext | null {
  if (!on || typeof window === "undefined") return null;
  try {
    context ??= new AudioContext();
  } catch {
    return null;
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

/**
 * The build-up while a drop comes in, `ms` long: ticks that come faster and faster, like a wheel
 * spinning up, over a shimmer that rises in pitch and opens up in brightness. It stops as the
 * drop arrives, where the payoff takes over.
 */
export function buildUp(ms: number) {
  [0, 0.3, 0.52, 0.68, 0.79, 0.87, 0.93, 0.97].forEach((at, i) =>
    setTimeout(() => cue("select", { emphasis: "subtle", volume: 0.16 + 0.03 * i, direction: "forward" }), at * ms),
  );
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const end = t + ms / 1000;
  const level = ctx.createGain();
  level.gain.setValueAtTime(0.0001, t);
  level.gain.exponentialRampToValueAtTime(0.035, end - 0.08);
  level.gain.exponentialRampToValueAtTime(0.0001, end + 0.05);
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(500, t);
  tone.frequency.exponentialRampToValueAtTime(4200, end);
  tone.connect(level).connect(ctx.destination);
  const voices: [number, number, OscillatorType][] = [
    [330, -6, "triangle"],
    [330, 7, "sawtooth"],
    [660, 0, "sine"],
  ];
  for (const [hz, detune, type] of voices) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(hz, t);
    osc.frequency.exponentialRampToValueAtTime(hz * 2.5, end);
    osc.connect(tone);
    osc.start(t);
    osc.stop(end + 0.1);
  }
}

/**
 * The payoff after a drop is collected: a warm "ahh". A soft C major chord through the two
 * formants of an open "ah" (about 800 and 1150 Hz), with a slow vibrato, swelling in and fading.
 */
export function warmAhh() {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const level = ctx.createGain();
  level.gain.setValueAtTime(0.0001, t);
  level.gain.exponentialRampToValueAtTime(0.12, t + 0.18);
  level.gain.setValueAtTime(0.12, t + 0.55);
  level.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
  level.connect(ctx.destination);
  const voice = ctx.createGain();
  voice.gain.value = 0.35;
  const dry = ctx.createBiquadFilter();
  dry.type = "lowpass";
  dry.frequency.value = 1800;
  const dryLevel = ctx.createGain();
  dryLevel.gain.value = 0.35;
  voice.connect(dry).connect(dryLevel).connect(level);
  for (const [hz, q] of [
    [800, 6],
    [1150, 8],
  ]) {
    const formant = ctx.createBiquadFilter();
    formant.type = "bandpass";
    formant.frequency.value = hz;
    formant.Q.value = q;
    const lift = ctx.createGain();
    lift.gain.value = 2.2;
    voice.connect(formant).connect(lift).connect(level);
  }
  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = 5;
  const depth = ctx.createGain();
  depth.gain.value = 6;
  vibrato.connect(depth);
  vibrato.start(t);
  vibrato.stop(t + 2.2);
  for (const hz of [261.63, 329.63, 392, 523.25]) {
    for (const detune of [-5, 5]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = hz;
      osc.detune.value = detune;
      depth.connect(osc.detune);
      osc.connect(voice);
      osc.start(t);
      osc.stop(t + 2.2);
    }
  }
}

/**
 * Your reply has gone out: a short airy lift (noise swept up through a band, like it leaving the
 * radio) under two bright notes that step up a fifth, A5 then E6, each ringing off quickly. It
 * says "sent" without the "ahh" of something arriving.
 */
export function replySent() {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime + 0.01;
  const out = ctx.createGain();
  out.gain.value = 0.9;
  out.connect(ctx.destination);

  const noise = ctx.createBufferSource();
  noise.buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.4), ctx.sampleRate);
  const data = noise.buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.4;
  band.frequency.setValueAtTime(700, t);
  band.frequency.exponentialRampToValueAtTime(5200, t + 0.32);
  const air = ctx.createGain();
  air.gain.setValueAtTime(0.0001, t);
  air.gain.exponentialRampToValueAtTime(0.05, t + 0.12);
  air.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
  noise.connect(band).connect(air).connect(out);
  noise.start(t);

  [880, 1318.5].forEach((hz, i) => {
    const at = t + 0.16 + i * 0.11;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = hz;
    const ring = ctx.createGain();
    ring.gain.setValueAtTime(0.0001, at);
    ring.gain.exponentialRampToValueAtTime(0.11, at + 0.01);
    ring.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);
    osc.connect(ring).connect(out);
    osc.start(at);
    osc.stop(at + 0.45);
  });
}
