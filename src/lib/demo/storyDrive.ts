import type { DropKind } from "@/components/drops/glyphs";
import type { LatLng, Route } from "@/lib/journey/geo";
import { headingAt, measure, offset, pointAt, slice } from "@/lib/nav/path";
import { I10_EAST } from "./i10";

/** Something someone else left at a spot on the road, waiting for you to collect it (what you leave is a drop). */
export type Pickup = { id: string; kind: DropKind; at: LatLng };

/** A scripted drive for the demo video: a fixed route, a fixed speed and what's waiting along it. */
export type DemoDrive = { name: string; route: Route; speed: number; pickups: Pickup[]; startDelayMs?: number };

/** m/s: about 50 mph, quick enough to feel like a freeway at the radio map's zoom. */
const SPEED = 22;
/** Where the story waits: this far along the drive, this far off the right side of the road. */
// The pickup pulls in at 60 m, so place it ~170 m ahead for a five-second drive-in at 22 m/s.
const STORY_ALONG = 170;
const STORY_OFF = 26;

const path = measure(I10_EAST);
const heading = headingAt(path, STORY_ALONG) ?? 90;

/**
 * Past the end of the recorded stretch, the same freeway on toward downtown (from the saved
 * Santa Monica to DTLA route), so Flows 2 to 4 keep driving instead of running out of road and
 * arriving. Only Flow 5 arrives. About 4.5 km more, three-odd minutes at the demo speed.
 */
const ONWARD = [
  { lat: 34.03523, lng: -118.3278 },
  { lat: 34.03538, lng: -118.32605 },
  { lat: 34.03662, lng: -118.31754 },
  { lat: 34.0366, lng: -118.31743 },
  { lat: 34.03679, lng: -118.3144 },
  { lat: 34.03688, lng: -118.31182 },
];
const LONG_POINTS = [...I10_EAST, ...ONWARD];
const longPath = measure(LONG_POINTS);

/**
 * Flow 2 · Message unlocks: wait three seconds, then drive for about three seconds before the
 * story from @Hufflepuff23 pulls in from the road.
 */
export const STORY_DRIVE: DemoDrive = {
  name: "Downtown LA",
  speed: SPEED,
  route: {
    points: LONG_POINTS,
    distance: longPath.length,
    duration: longPath.length / SPEED,
    steps: [
      { maneuver: "STRAIGHT", instruction: "Head east on I-10", distance: 900 },
      { maneuver: "STRAIGHT", instruction: "Continue on I-10 E toward Los Angeles", distance: longPath.length - 900 },
    ],
  },
  pickups: [{ id: "nightowl-burrito", kind: "story", at: offset(pointAt(path, STORY_ALONG), heading + 90, STORY_OFF) }],
};

/** Navigation-only route for the company call demo: it moves without triggering a story pickup. */
export const COMPANY_DRIVE: DemoDrive = { ...STORY_DRIVE, name: "NightOwl's route", pickups: [] };

/** The question-answer demo starts already moving, then pulls a question mark in from the road. */
export const QUESTION_DRIVE: DemoDrive = {
  ...STORY_DRIVE,
  name: "NightOwl's question route",
  pickups: [{ id: "nightowl-road-question", kind: "question", at: offset(pointAt(path, 88), (headingAt(path, 88) ?? heading) + 90, STORY_OFF) }],
};

/** Flow 5 · Your drive becomes a story: how far out the drive picks up, and the pause before it sets off. */
const ARRIVE_LAST_M = 330;
const ARRIVE_DELAY_MS = 1500;
const arrivePoints = slice(path, Math.max(0, path.length - ARRIVE_LAST_M), path.length);
const arrivePath = measure(arrivePoints);

/**
 * Flow 5 opens on the last stretch of the drive: about fifteen seconds of road, then you pull up
 * at the destination pin. Reaching it is the arrival (the map tells the radio), so the radio
 * switches on and the recorded "Thank you so much for riding with us" plays only once you're there.
 */
export const ARRIVE_DRIVE: DemoDrive = {
  name: "Downtown LA",
  speed: SPEED,
  startDelayMs: ARRIVE_DELAY_MS,
  route: {
    points: arrivePoints,
    distance: arrivePath.length,
    duration: arrivePath.length / SPEED,
    steps: [{ maneuver: "STRAIGHT", instruction: "Continue on I-10 E toward Los Angeles", distance: arrivePath.length }],
  },
  pickups: [],
};
