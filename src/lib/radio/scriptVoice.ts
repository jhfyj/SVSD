/*
  The radio's own voice, recorded for the demo script (ElevenLabs, "Meg - Calm female voice"), in
  public/voice. Where a line in the script has a recording, the radio plays it instead of the
  browser's speech, so the film has one consistent voice. Anything else still uses announce().
*/

import { announce, playVoice } from "./voice";

/** A recorded line, and when each LCD page should turn (ms from the start of the voice). */
export type RecordedLine = { src: string; pages: number[] };

const key = (handle: string) => handle.replace(/^@/, "").toLowerCase();

/**
 * The radio introducing you both once a call connects (3 · Company: one stranger).
 * Keyed "me|peer"; `miles` is only there when the recording says it.
 */
const INTROS: { me: string; peer: string; miles?: number; line: RecordedLine }[] = [
  // "NightOwl, meet Mothlight. You've got 84 miles of road together. To start, where are you both headed tonight?"
  { me: "nightowl", peer: "mothlight", miles: 84, line: { src: "/voice/intro-nightowl-mothlight.mp3", pages: [0, 5700] } },
  // "NightOwl, meet urmom6767. To start, where are y'all headed tonight?" (no miles in this take)
  { me: "nightowl", peer: "urmom6767", line: { src: "/voice/intro-nightowl-urmom6767.mp3", pages: [0, 3550] } },
];

/** The recorded intro for this pair, if the script has one. */
export function recordedIntro(me: string, peer: string, miles: number): RecordedLine | null {
  const hit = INTROS.find((i) => i.me === key(me) && i.peer === key(peer) && (i.miles === undefined || i.miles === miles));
  return hit?.line ?? null;
}

/**
 * The radio introducing you both: the recorded take when the script has one for this pair, the
 * browser's speech a line at a time otherwise (or if the file won't play). `onPage(i)` fires as
 * each LCD page should show.
 */
export function sayIntro(
  me: string,
  peer: string,
  miles: number,
  lines: string[],
  onPage: (i: number) => void,
): { done: Promise<void>; stop: () => void } {
  let stopped = false;
  let current: { stop: () => void } | null = null;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const recorded = recordedIntro(me, peer, miles);
  const done = (async () => {
    if (recorded) {
      const v = playVoice(recorded.src, true);
      current = v;
      // If the file can't play, or the browser holds it back for too long, the speech takes over.
      const began = await Promise.race([
        v.started.then(() => true),
        v.done.then(
          () => true,
          () => false,
        ),
        new Promise<boolean>((resolve) => timers.push(setTimeout(() => resolve(false), START_TIMEOUT_MS))),
      ]);
      if (stopped) return;
      if (began) {
        recorded.pages.forEach((at, i) => timers.push(setTimeout(() => !stopped && onPage(i), at)));
        const finished = await v.done.then(
          () => true,
          () => false,
        );
        if (finished || stopped) return;
      } else {
        v.stop();
      }
    }
    for (let i = 0; i < lines.length && !stopped; i++) {
      onPage(i);
      const line = announce(lines[i]);
      current = line;
      await line.done;
    }
  })();
  return {
    done,
    stop: () => {
      stopped = true;
      timers.forEach(clearTimeout);
      current?.stop();
    },
  };
}

/**
 * After a message on the road finishes (2 · Stories on the road, "Reply?"):
 * "Would you like to reply to this message? Reply with yes or no."
 */
export const REPLY_PROMPT = "/voice/reply-prompt.mp3";

/** A recording that hasn't started by now (blocked, or a background tab) is skipped, so the radio never hangs. */
export const START_TIMEOUT_MS = 2500;

/** How long you still have to say yes once the prompt has finished. */
export const REPLY_PROMPT_GRACE_MS = 4000;
