import { isSoundOn } from "../sound";
import { VOICE_GAIN } from "./levels";

/*
  Voices on the radio: playing a message left on the road, the static-and-tune sound before it,
  and recording your reply. Each one hands back a live level (0–1) read from the actual audio,
  so the screen can move with the voice. The level is read before the volume, so the glow still
  moves with the app's sound switched off.
*/

/** How loud the voice is right now, 0 (silent) to 1 (loud speech). */
export type Level = () => number;

let ctx: AudioContext | null = null;
function audio() {
  ctx ??= new AudioContext();
  void ctx.resume();
  return ctx;
}

/**
 * Browsers only play sound on a page after someone has tapped, clicked or pressed a key on it.
 * True once that's happened (or where the browser can't tell us, so we never wait for nothing).
 */
export function soundAllowed(): boolean {
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return ua ? ua.hasBeenActive : true;
}

/**
 * Calls `go` once sound can play: straight away if the page has already been tapped, otherwise on
 * the first tap, click or key press anywhere. Wakes the audio inside that tap, so the voice that
 * follows isn't blocked. Returns a cancel.
 */
export function whenSoundAllowed(go: () => void): () => void {
  if (soundAllowed()) {
    go();
    return () => {};
  }
  const events = ["pointerdown", "keydown", "touchend"] as const;
  const unlock = () => {
    events.forEach((e) => document.removeEventListener(e, unlock, true));
    audio();
    go();
  };
  events.forEach((e) => document.addEventListener(e, unlock, true));
  return () => events.forEach((e) => document.removeEventListener(e, unlock, true));
}
/** RMS of the waveform, scaled so ordinary speech sits around 0.3–0.8. */
function meter(analyser: AnalyserNode, boost: number): Level {
  const buf = new Float32Array(analyser.fftSize);
  return () => {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.min(1, Math.sqrt(sum / buf.length) * boost);
  };
}

function analyserOf(c: AudioContext) {
  const analyser = c.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0;
  return analyser;
}

/** Like the music: out loud on speaker, quieter held to your ear. Silent while the app's sound is off. */
const volume = (speaker: boolean) => (!isSoundOn() ? 0 : speaker ? 1 : 0.55);

export type Voice = {
  level: Level;
  /** Resolves when their voice actually starts (browsers can hold audio until a first tap). */
  started: Promise<void>;
  /** Resolves when they've finished; rejects if the recording can't play. */
  done: Promise<void>;
  setSpeaker: (on: boolean) => void;
  stop: () => void;
};

/**
 * Play someone's recording. If the browser blocks it until a tap, it starts on the next tap.
 * `silent` plays it with no sound: the glow and timing still follow the voice, but nothing is
 * heard (for placeholder voices that aren't the demo's ElevenLabs takes). Every voice is brought
 * to one loudness (lib/radio/levels, or `gain`) before the glow reads it, so nothing jumps between
 * voices and a quiet take moves the glow as much as a loud one.
 */
export function playVoice(
  src: string,
  speaker: boolean,
  { silent = false, gain: level = VOICE_GAIN[src] ?? 1 }: { silent?: boolean; gain?: number } = {},
): Voice {
  const c = audio();
  const el = new Audio(src);
  const source = c.createMediaElementSource(el);
  const analyser = analyserOf(c);
  const even = c.createGain();
  even.gain.value = level;
  const gain = c.createGain();
  const loudness = (on: boolean) => (silent ? 0 : volume(on));
  gain.gain.value = loudness(speaker);
  source.connect(even);
  even.connect(analyser);
  // A peak limiter: voices are brought up to one loudness, and this keeps their loudest moments
  // from clipping without touching ordinary speech.
  const limit = c.createDynamicsCompressor();
  limit.threshold.value = -3;
  limit.knee.value = 0;
  limit.ratio.value = 20;
  limit.attack.value = 0.002;
  limit.release.value = 0.1;
  even.connect(gain).connect(limit).connect(c.destination);

  let stopped = false;
  const retry = () => {
    if (!stopped) void c.resume().then(() => el.play()).catch(() => {});
  };
  const started = new Promise<void>((resolve) => el.addEventListener("playing", () => resolve(), { once: true }));
  const done = new Promise<void>((resolve, reject) => {
    el.addEventListener("ended", () => resolve(), { once: true });
    el.addEventListener("error", () => reject(new Error(`Couldn't play ${src}`)), { once: true });
  });
  el.play().catch(() => document.addEventListener("pointerdown", retry, { once: true }));

  return {
    level: meter(analyser, 4),
    started,
    done,
    setSpeaker: (on) => (gain.gain.value = loudness(on)),
    stop: () => {
      stopped = true;
      document.removeEventListener("pointerdown", retry);
      el.pause();
      source.disconnect();
      even.disconnect();
      gain.disconnect();
      limit.disconnect();
    },
  };
}

/** How long the radio takes to find the station before their voice. */
export const TUNE_MS = 1100;

/** The radio finding the station: a silent pause (the static shows on screen only). Resolves when it's done. */
export function tuneIn(): Promise<void> {
  // Silent for the demo (Jen): the static and whistle read as a random sound effect, so only the
  // flicker on screen is kept. The pause stays, so the station still "locks" before the voice.
  audio();
  return new Promise((resolve) => setTimeout(resolve, TUNE_MS));
}

export type Recording = {
  level: Level;
  /** Stops and hands back what was recorded (null where the browser can't record). */
  stop: () => Promise<Blob | null>;
  /** Stops and throws it away. */
  cancel: () => void;
};

/** Start recording your reply. Rejects if there's no microphone or it's blocked. */
export async function recordReply(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const c = audio();
  const source = c.createMediaStreamSource(stream);
  const analyser = analyserOf(c);
  source.connect(analyser);
  const recorder = typeof MediaRecorder === "undefined" ? null : new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder?.addEventListener("dataavailable", (e) => chunks.push(e.data));
  recorder?.start();

  const close = () => {
    stream.getTracks().forEach((track) => track.stop());
    source.disconnect();
  };
  return {
    level: meter(analyser, 6),
    stop: () =>
      new Promise((resolve) => {
        if (!recorder || recorder.state === "inactive") {
          close();
          return resolve(null);
        }
        recorder.addEventListener("stop", () => {
          close();
          resolve(new Blob(chunks, { type: recorder.mimeType }));
        }, { once: true });
        recorder.stop();
      }),
    cancel: () => {
      if (recorder && recorder.state !== "inactive") recorder.stop();
      close();
    },
  };
}

/**
 * A line the radio would say that has no recording. It stays silent (Jen: the only voice in the
 * demo is the ElevenLabs one, never the browser's robot speech) and resolves after about as long
 * as it would take to say, so whatever's on screen still gets read. Recorded lines go through
 * lib/radio/scriptVoice instead. Cancel with the returned stop.
 */
export function announce(text: string): { done: Promise<void>; stop: () => void } {
  const estimate = 1200 + text.length * 65;
  let finish = () => {};
  const done = new Promise<void>((resolve) => (finish = resolve));
  const timer = setTimeout(() => finish(), estimate);
  return {
    done,
    stop: () => {
      clearTimeout(timer);
      finish();
    },
  };
}
