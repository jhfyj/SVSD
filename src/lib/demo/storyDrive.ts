import type { DropKind } from "@/components/drops/glyphs";
import type { LatLng, Route } from "@/lib/journey/geo";
import { headingAt, measure, offset, pointAt } from "@/lib/nav/path";
import { I10_EAST } from "./i10";

/** Something someone else left at a spot on the road, waiting for you to collect it (what you leave is a drop). */
export type Pickup = { id: string; kind: DropKind; at: LatLng };

/** A scripted drive for the demo video: a fixed route, a fixed speed and what's waiting along it. */
export type DemoDrive = { name: string; route: Route; speed: number; pickups: Pickup[] };

/** m/s: about 50 mph, quick enough to feel like a freeway at the radio map's zoom. */
const SPEED = 22;
/** Where the story waits: this far along the drive, this far off the right side of the road. */
const STORY_ALONG = 150;
const STORY_OFF = 26;

const path = measure(I10_EAST);
const heading = headingAt(path, STORY_ALONG) ?? 90;

/**
 * Flow 2 · Message unlocks: about five seconds down the I-10, a story from @NightOwl sits just
 * off the road, and the car pulls it in as it passes.
 */
export const STORY_DRIVE: DemoDrive = {
  name: "Downtown LA",
  speed: SPEED,
  route: {
    points: I10_EAST,
    distance: path.length,
    duration: path.length / SPEED,
    steps: [
      { maneuver: "STRAIGHT", instruction: "Head east on I-10", distance: 900 },
      { maneuver: "STRAIGHT", instruction: "Continue on I-10 E toward Los Angeles", distance: path.length - 900 },
    ],
  },
  pickups: [{ id: "nightowl-burrito", kind: "story", at: offset(pointAt(path, STORY_ALONG), heading + 90, STORY_OFF) }],
};
