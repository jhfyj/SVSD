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
 * checkin: it asks its question out loud. listening: it waits for an answer, and none comes.
 * nothing: NOTHING HEARD. rerouting: it reroutes you to the rest area by itself (nothing to tap).
 * Stories keep coming the whole way (Jen: especially when you're tired); they only hold off while
 * Night mode is speaking, and play right after. stopped: you're at the rest area, parked: the dot
 * on the map holds still until you say you're back on the road.
 */
export type NightPhase = "off" | "day" | "dusk" | "relight" | "nightOn" | "night" | "checkin" | "listening" | "nothing" | "rerouting" | "stopped";

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

export const REST_AREA = { miles: 9, breakMinutes: 15 };

/** How long it listens for an answer before it gives up. */
export const LISTEN_MS = 5000;
/** NOTHING HEARD holds on the LCD before the reroute. */
export const NOTHING_MS = 2200;
/** From the reroute to pulling in at the rest area, in the demo (really: 9 miles, then parked). */
export const REST_ARRIVE_MS = 7000;

/** What the radio says when you pull in. No recording yet, so it stays silent. */
export const STOPPED_LINE = `You made it. Take ${REST_AREA.breakMinutes} minutes.`;

/**
 * Night mode's recorded lines (Jen's ElevenLabs takes, Oct 19). Each says what the LCD shows at
 * that moment. "Still with me?" has no recording: the check-in plays "Tell me…" only.
 */
export const NIGHT_VOICE = {
  /** "Night mode on, screen dimmed for the dark." */
  on: "/voice/night-mode-on.mp3",
  /** "214 driving tonight." */
  tonight: "/voice/night-214-driving.mp3",
  /** "Tell me one thing you can see." */
  checkIn: "/voice/night-tell-me.mp3",
  /** "Nothing heard. Let's take a break." */
  nothing: "/voice/night-nothing-heard.mp3",
  /** "Rerouting. Rest area in 9 miles." */
  rerouting: "/voice/night-rerouting.mp3",
} as const;

/** A beat after a recorded line before the next moment. */
export const AFTER_LINE_MS = 500;

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
