import type { Trip } from "../trip/trip";
import { contentFor } from "./trail";

/*
  The stories a past drive is remembered by. There's no story log yet, so each trip gets one from
  this list, picked the same way every time from when it started. Swap `tripStories` for the real
  log later: the start screen only needs the counts and the one story worth repeating.
*/

export type HeardStory = {
  /** How it opens, in the teller's words. */
  text: string;
  from: string;
  near: string;
  /** How far along the route it played, 0 to 1. */
  at: number;
};

const STORIES: Omit<HeardStory, "at">[] = [
  { text: "Dad stopped at every fruit stand. Every single one.", from: "@Hufflepuff23", near: "exit 12" },
  { text: "Someone left a whole wedding cake here. We ate it.", from: "@Nightowl88", near: "mile 84" },
  { text: "The night I almost turned around, I kept going here.", from: "@Jhfnx", near: "exit 335" },
  { text: "Fog so thick we followed a truck's lights for an hour.", from: "@Roadrunner5", near: "the pass" },
  { text: "My grandma learned to drive on this road at sixty-two.", from: "@Mile84", near: "exit 201" },
  { text: "Best tacos of my life: a gas station two exits back.", from: "@Urmom2424", near: "exit 74" },
];

/** Cheap deterministic hash, so the server and client pick the same story. */
const pick = (seed: number, n: number) => Math.abs(Math.imul(seed | 0, 2654435761) >> 7) % n;

export function tripStories(trip: Trip) {
  const { stories, questions } = contentFor(trip.minutes);
  // Seeded by the drive itself, not when it started, so the samples keep their stories.
  const seed = [...trip.to].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, trip.miles * 7 + trip.minutes);
  const story = STORIES[pick(seed, STORIES.length)];
  // Somewhere in the middle of the drive, never on its first or last dot.
  const at = 0.25 + (pick(seed + 1, 50) / 100);
  return { stories, questions, highlight: { ...story, at } };
}
