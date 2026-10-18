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

/** A gentle soft-clip curve: rounds off the peaks the way a small radio speaker does. */
function softClip(drive: number) {
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = ((1 + drive) * x) / (1 + drive * Math.abs(x));
  }
  return curve;
}

/**
 * Over the air: the voice squeezed into a radio's band (about 350 Hz to 3.2 kHz) with a little
 * presence and soft clipping, plus a quiet bed of static under it for as long as it plays.
 * Returns the node to take the voice from, and a stop for the static.
 */
function overTheAir(c: AudioContext, input: AudioNode, out: AudioNode): { voice: AudioNode; stop: () => void } {
  const low = c.createBiquadFilter();
  low.type = "highpass";
  low.frequency.value = 350;
  const high = c.createBiquadFilter();
  high.type = "lowpass";
  high.frequency.value = 3200;
  const presence = c.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 1800;
  presence.gain.value = 4;
  const clip = c.createWaveShaper();
  clip.curve = softClip(1.6);
  clip.oversample = "2x";
  // The band cuts the voice's weight, so bring it back up to about where it was.
  const makeUp = c.createGain();
  makeUp.gain.value = 1.4;
  input.connect(low).connect(high).connect(presence).connect(clip).connect(makeUp);

  const noise = c.createBufferSource();
  noise.buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const data = noise.buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise.loop = true;
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2400;
  band.Q.value = 0.6;
  const hiss = c.createGain();
  const t = c.currentTime;
  hiss.gain.setValueAtTime(0.0001, t);
  hiss.gain.exponentialRampToValueAtTime(0.025, t + 0.15);
  noise.connect(band).connect(hiss).connect(out);
  noise.start(t);

  let ended = false;
  return {
    voice: makeUp,
    stop: () => {
      if (ended) return;
      ended = true;
      const now = c.currentTime;
      hiss.gain.cancelScheduledValues(now);
      hiss.gain.setValueAtTime(hiss.gain.value, now);
      hiss.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      noise.stop(now + 0.25);
    },
  };
}

/**
 * Play someone's recording. If the browser blocks it until a tap, it starts on the next tap.
 * `radio` plays it over the air (band-limited, with static); the level still reads the clean voice.
 */
export function playVoice(src: string, speaker: boolean, { radio = false }: { radio?: boolean } = {}): Voice {
  const c = audio();
  const el = new Audio(src);
  const source = c.createMediaElementSource(el);
  const analyser = analyserOf(c);
  const gain = c.createGain();
  gain.gain.value = volume(speaker);
  source.connect(analyser);
  gain.connect(c.destination);
  const air = radio ? overTheAir(c, source, gain) : null;
  (air?.voice ?? source).connect(gain);

  let stopped = false;
  const retry = () => {
    if (!stopped) void c.resume().then(() => el.play()).catch(() => {});
  };
  const started = new Promise<void>((resolve) => el.addEventListener("playing", () => resolve(), { once: true }));
  const done = new Promise<void>((resolve, reject) => {
    el.addEventListener("ended", () => resolve(), { once: true });
    el.addEventListener("error", () => reject(new Error(`Couldn't play ${src}`)), { once: true });
  });
  // The static goes when the voice does.
  void done.then(() => air?.stop(), () => air?.stop());
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
      air?.stop();
      source.disconnect();
      // Let the static fade out before cutting it off.
      setTimeout(() => gain.disconnect(), 300);
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

/** "@Nightowl88" read aloud as "Nightowl 88", "@NightOwl" as "Night Owl". */
const spoken = (text: string) =>
  text.replace(/@(\w+)/g, (_, h: string) => h.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/(\D)(\d)/g, "$1 $2"));

/**
 * The radio's own voice (announcements like who you're meeting), with the browser's speech.
 * Resolves when it's done; with the sound off, or no speech in the browser, after about as long as
 * it would take to say, so whatever's on screen still gets read. Cancel with the returned stop.
 */
export function announce(text: string): { done: Promise<void>; stop: () => void } {
  const estimate = 1200 + text.length * 65;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finish = () => {};
  const done = new Promise<void>((resolve) => {
    finish = () => {
      clearTimeout(timer);
      resolve();
    };
  });
  const synth = typeof speechSynthesis === "undefined" ? null : speechSynthesis;
  if (!synth || !isSoundOn()) {
    timer = setTimeout(finish, estimate);
    return { done, stop: finish };
  }
  const line = new SpeechSynthesisUtterance(spoken(text));
  line.lang = "en-US";
  line.rate = 1;
  const voices = synth.getVoices().filter((v) => v.lang.startsWith("en"));
  line.voice = voices.find((v) => /Samantha|Google US English/.test(v.name)) ?? voices[0] ?? null;
  line.addEventListener("end", finish);
  line.addEventListener("error", finish);
  // Some browsers drop the end event; never hold the radio up waiting for it.
  timer = setTimeout(finish, estimate + 4000);
  synth.speak(line);
  return {
    done,
    stop: () => {
      synth.cancel();
      finish();
    },
  };
}

export type Answer = "yes" | "no";

const YES = /\b(yes|yeah|yep|yup|sure|ok|okay|alright|respond|reply)\b/i;
const NO = /\b(no|nope|nah|not now|skip|later|never ?mind)\b/i;

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  abort: () => void;
};

/**
 * Listen for a yes or a no, out loud, for up to `timeoutMs`. Resolves on the first one heard
 * (interim results count, so it answers as you say it), or null when time runs out. Where the
 * browser has no speech recognition, or the mic is blocked, it just waits out the time, so the
 * YES / NO keys still work.
 */
export function listenYesNo(timeoutMs: number): { result: Promise<Answer | null>; stop: () => void } {
  let settle: (answer: Answer | null) => void = () => {};
  const result = new Promise<Answer | null>((resolve) => (settle = resolve));
  const w = typeof window === "undefined" ? null : (window as unknown as Record<string, (new () => Recognition) | undefined>);
  const Ctor = w?.SpeechRecognition ?? w?.webkitSpeechRecognition;
  let rec: Recognition | null = null;
  let over = false;
  let blocked = false;
  const finish = (answer: Answer | null) => {
    if (over) return;
    over = true;
    clearTimeout(timer);
    rec?.abort();
    settle(answer);
  };
  const timer = setTimeout(() => finish(null), timeoutMs);
  const start = () => {
    if (!Ctor || over || blocked) return;
    rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const heard = Array.from(e.results, (r) => r[0]?.transcript ?? "").join(" ");
      // "No" first, so "no, not now" never reads as a yes because of the "now".
      if (NO.test(heard)) finish("no");
      else if (YES.test(heard)) finish("yes");
    };
    // Some browsers stop listening after a pause: keep going until there's an answer or time's up.
    rec.onend = () => {
      if (!over) setTimeout(start, 100);
    };
    rec.onerror = (e) => {
      // No mic, or it's blocked: stop listening, but leave the keys their time.
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") blocked = true;
    };
    try {
      rec.start();
    } catch {
      blocked = true;
    }
  };
  start();
  return { result, stop: () => finish(null) };
}
