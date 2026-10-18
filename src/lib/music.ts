import { isSoundOn } from "./sound";

/*
  The radio's music button: a random chiptune loop, made with Web Audio so nothing needs licensing.
  Each start picks a new key, scale, tempo and melody. Silent while the app's sound is off.
*/

const SCALES = [
  [0, 2, 4, 7, 9], // major pentatonic
  [0, 3, 5, 7, 10], // minor pentatonic
  [0, 2, 4, 5, 7, 9, 11], // major
  [0, 2, 3, 5, 7, 8, 10], // minor
];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let speaker = false;
const level = () => (!isSoundOn() ? 0 : speaker ? 0.08 : 0.03);

const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function note(at: number, midi: number, length: number, type: OscillatorType, level: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.value = hz(midi);
  env.gain.setValueAtTime(level, at);
  env.gain.setValueAtTime(0, at + length * 0.85);
  osc.connect(env).connect(master);
  osc.start(at);
  osc.stop(at + length);
}

/** Start a new random tune, replacing any that is playing. */
export function startMusic() {
  stopMusic();
  ctx ??= new AudioContext();
  void ctx.resume();
  master = ctx.createGain();
  master.gain.value = level();
  master.connect(ctx.destination);

  const scale = pick(SCALES);
  const root = 57 + Math.floor(Math.random() * 7);
  const step = 60 / (90 + Math.floor(Math.random() * 50)) / 2; // eighth notes
  const degree = (d: number) => root + 12 * Math.floor(d / scale.length) + scale[((d % scale.length) + scale.length) % scale.length];

  // Two bars of melody with a few rests, over a root/fifth bass, looped.
  const melody = Array.from({ length: 16 }, () => (Math.random() < 0.2 ? null : Math.floor(Math.random() * (scale.length + 3))));
  const bass = [0, 0, 4, 4].map((d) => root - 12 + (d === 4 ? 7 : 0));

  let at = ctx.currentTime + 0.05;
  const loop = () => {
    if (!ctx) return;
    melody.forEach((d, i) => {
      if (d !== null) note(at + i * step, degree(d), step, "square", 0.5);
      if (i % 4 === 0) note(at + i * step, bass[i / 4], step * 4, "triangle", 0.9);
    });
    at += melody.length * step;
    timer = setTimeout(loop, (at - ctx.currentTime - 0.2) * 1000);
  };
  loop();
}

export function stopMusic() {
  if (timer) clearTimeout(timer);
  timer = null;
  master?.disconnect();
  master = null;
}

/** Follows the radio's speaker button: on speaker it plays out loud, off speaker it's quieter, like a phone held to your ear. */
export function setMusicSpeaker(on: boolean) {
  speaker = on;
  if (master) master.gain.value = level();
}
