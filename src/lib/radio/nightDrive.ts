import type { Level } from "./voice";

/*
  Night mode (Flow 6 in the demo video): after dark the radio turns amber so it won't light up the
  car, checks in with a question to answer out loud, and when the answers slow down it tells you
  to stop at the next rest area. Nothing to tap: the radio talks, you talk back.
  All of it is scripted for the video: no real voice input, no real fatigue detection.
*/

/** Where the night script starts: sunset, the check-in, or straight at the rest area. */
export type NightStart = "fall" | "checkin" | "rest";

export const NIGHT_STARTS: NightStart[] = ["fall", "checkin", "rest"];

/**
 * day: the day radio, driving, before the sun goes down.
 * dusk: the sun sinks across the map and its light fades toward amber.
 * relight: the radio dips and flickers back on in amber (the theme switches under the flicker).
 * nightOn: NIGHT MODE ON on the LCD. night: the quiet amber radio, before it checks in.
 * checkin: the radio asks its question out loud. listening: your answer, slow.
 * rest: the rest area takes over the map; stories pause.
 */
export type NightPhase = "off" | "day" | "dusk" | "relight" | "nightOn" | "night" | "checkin" | "listening" | "rest";

/** The day radio holds this long before sunset, so the day cockpit reads first (and the map has loaded). */
export const DAY_MS = 3000;
/** Sun from the top of the map to below its bottom edge, in hard pixel steps. */
export const DUSK_MS = 2400;
/** The radio dipping and flickering back on (matches .night-relight in globals.css). */
export const RELIGHT_MS = 480;
/** NIGHT MODE ON holds on the LCD. */
export const NIGHT_ON_MS = 2800;
/** The quiet amber radio before the first check-in (in the video, the drive goes on a while). */
export const NIGHT_HOLD_MS = 2600;
/** A beat between your answer trailing off and the radio telling you to stop. */
export const ANSWER_BEAT_MS = 900;

/** What the radio asks. One question, answered out loud, keeps your mind on the road. */
export const CHECK_IN = { title: "Still with me?", ask: "Tell me one thing you can see." };

/** How many drivers the LCD says are out tonight (mocked). */
export const DRIVING_TONIGHT = 214;

export const REST_AREA = { miles: 9 };

/** The radio's clock for each take: the sun going down, and the small hours for the check-in. */
export const NIGHT_CLOCK: Record<NightStart, string> = { fall: "7:48 PM", checkin: "1:14 AM", rest: "1:16 AM" };

/** What the radio says when it tells you to stop, while the rest area takes over. */
export const REST_LINE = `Your answers are slowing down. There's a rest area in ${REST_AREA.miles} miles. Let's stop there.`;

/**
 * Jay's answer, slow and yawning: "…a sign. A… green sign." Three short bursts with long gaps,
 * in ms from when the radio starts listening, and how loud each is (0–1).
 */
const ANSWER: { from: number; to: number; loud: number }[] = [
  { from: 500, to: 1300, loud: 0.5 },
  { from: 2700, to: 3100, loud: 0.32 },
  { from: 4400, to: 5600, loud: 0.48 },
];

/** How long the answer runs, gaps included, before it trails off. */
export const ANSWER_MS = 6300;

/**
 * A stand-in for the mic while you answer: the level of that slow answer, with syllables, so the
 * glow and the LCD meter move like a voice. Starts counting from when it's made.
 */
export function sleepyAnswer(): Level {
  const start = performance.now();
  return () => {
    const t = performance.now() - start;
    const burst = ANSWER.find((b) => t >= b.from && t <= b.to);
    if (!burst) return 0;
    // Syllables: a bump every ~180ms, softened at both ends of the burst.
    const k = (t - burst.from) / (burst.to - burst.from);
    const shape = Math.sin(Math.PI * k);
    const syllable = 0.55 + 0.45 * Math.abs(Math.sin((t - burst.from) / 58));
    return burst.loud * shape * syllable;
  };
}
