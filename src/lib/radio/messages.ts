import type { MarkerColor } from "@/components/ui/MapMarker";
import type { CharacterId } from "@/lib/profile/characters";

/*
  Messages left along the road (passive intake): a story or a question someone recorded at a spot
  on your route. Each one plays as you pass its marker, while the radio's off (never over a live
  call). You get 5 seconds from when their voice starts to say you'll respond; if you do, the radio
  records your reply once they finish. Mocked until there's a backend: the voices are in
  public/messages, made with macOS `say`.
*/

export type RouteMessageKind = "message" | "question";

export type RouteMessage = {
  id: string;
  kind: RouteMessageKind;
  from: string;
  character: CharacterId;
  /** Their recording. */
  src: string;
  /**
   * An ElevenLabs take for the demo, so it's heard. Without it the recording is a macOS `say`
   * placeholder: it still plays (the glow moves with it, the timing holds) but silently.
   */
  recorded?: boolean;
  /** Optional transcript shown while the recording plays. */
  transcript?: string;
  /** Where it was left, as a share of the way along your route (0 is the start, 1 the destination). */
  at: number;
};

/** Messages are magenta, questions sky, so they read apart on the map. */
export const MESSAGE_COLOR: Record<RouteMessageKind, MarkerColor> = { message: "magenta", question: "sky" };

/** How long after their voice starts you can still choose to respond. */
export const RESPOND_WINDOW_MS = 5000;
/** The longest reply you can record (one button, voice only). */
export const REPLY_MAX_MS = 60_000;

export const SAMPLE_MESSAGES: RouteMessage[] = [
  { id: "water-tower", kind: "message", from: "@Hufflepuff23", character: "squirrel", src: "/messages/water-tower.mp3", at: 0.12 },
  { id: "favorite-song", kind: "question", from: "@urmom2424", character: "rabbit", src: "/messages/favorite-song.mp3", at: 0.35 },
  { id: "diner-pie", kind: "message", from: "@Nightowl88", character: "frog", src: "/messages/diner-pie.mp3", at: 0.6 },
  { id: "up-tonight", kind: "question", from: "@Roadrunner5", character: "turtle", src: "/messages/up-tonight.mp3", at: 0.82 },
];
