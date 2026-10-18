import { isSoundOn } from "./sound";

/*
  Radio static while the radio is connecting: white noise through a band-pass, like an AM radio
  between stations. Made with Web Audio, so there's no file to license. Silent while the app's
  sound is off.
*/

let ctx: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let master: GainNode | null = null;
let muted = false;

const LEVEL = 0.05;

export function startStatic() {
  stopStatic();
  ctx ??= new AudioContext();
  void ctx.resume();

  // Two seconds of noise, looped.
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1800;
  band.Q.value = 0.7;
  master = ctx.createGain();
  master.gain.value = muted || !isSoundOn() ? 0 : LEVEL;
  source.connect(band).connect(master).connect(ctx.destination);
  source.start();
}

export function stopStatic() {
  source?.stop();
  source = null;
  master?.disconnect();
  master = null;
}

/** Follows the radio's speaker button. */
export function setStaticMuted(next: boolean) {
  muted = next;
  if (master) master.gain.value = muted || !isSoundOn() ? 0 : LEVEL;
}
