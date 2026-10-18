import { isSoundOn } from "../sound";

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

/** Play someone's recording. If the browser blocks it until a tap, it starts on the next tap. */
export function playVoice(src: string, speaker: boolean): Voice {
  const c = audio();
  const el = new Audio(src);
  const source = c.createMediaElementSource(el);
  const analyser = analyserOf(c);
  const gain = c.createGain();
  gain.gain.value = volume(speaker);
  source.connect(analyser);
  source.connect(gain).connect(c.destination);

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
    setSpeaker: (on) => (gain.gain.value = volume(on)),
    stop: () => {
      stopped = true;
      document.removeEventListener("pointerdown", retry);
      el.pause();
      source.disconnect();
      gain.disconnect();
    },
  };
}

/** How long the static-and-tune sound runs before their voice. */
export const TUNE_MS = 1100;

/**
 * The radio finding the station: a burst of static whose band sweeps up while a whistle glides
 * down onto the frequency, then a short blip as it locks. Resolves when it's done.
 */
export function tuneIn(): Promise<void> {
  const c = audio();
  const t = c.currentTime + 0.02;
  const out = c.createGain();
  out.gain.value = isSoundOn() ? 0.16 : 0;
  out.connect(c.destination);

  const noise = c.createBufferSource();
  noise.buffer = c.createBuffer(1, Math.ceil(c.sampleRate * 0.9), c.sampleRate);
  const data = noise.buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 0.9;
  band.frequency.setValueAtTime(500, t);
  band.frequency.exponentialRampToValueAtTime(3200, t + 0.7);
  const hiss = c.createGain();
  hiss.gain.setValueAtTime(0, t);
  hiss.gain.linearRampToValueAtTime(0.9, t + 0.05);
  hiss.gain.setValueAtTime(0.9, t + 0.5);
  hiss.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
  noise.connect(band).connect(hiss).connect(out);
  noise.start(t);

  const whistle = c.createOscillator();
  whistle.frequency.setValueAtTime(1800, t);
  whistle.frequency.exponentialRampToValueAtTime(660, t + 0.7);
  const wg = c.createGain();
  wg.gain.setValueAtTime(0, t);
  wg.gain.linearRampToValueAtTime(0.22, t + 0.2);
  wg.gain.setValueAtTime(0.22, t + 0.6);
  wg.gain.linearRampToValueAtTime(0, t + 0.78);
  whistle.connect(wg).connect(out);
  whistle.start(t);
  whistle.stop(t + 0.8);

  const blip = c.createOscillator();
  blip.type = "square";
  blip.frequency.value = 880;
  const bg = c.createGain();
  bg.gain.value = 0.12;
  blip.connect(bg).connect(out);
  blip.start(t + 0.84);
  blip.stop(t + 0.92);

  return new Promise((resolve) =>
    setTimeout(() => {
      out.disconnect();
      resolve();
    }, TUNE_MS),
  );
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
