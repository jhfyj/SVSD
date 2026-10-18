
/** What a drop is sorted into: a question to answer, a story, or a tip about this stretch of road. */
export type DropKind = "question" | "story" | "tip";

/*
  Drops: the other half of messages on the road. Angelina's route messages are what you hear as you
  pass a spot; a drop is you leaving one. One console key records it (your real voice, the same
  recorder as a reply), it's sorted into a question, a story or a tip, and it's left on the map at the
  spot you dropped it, for whoever drives this road next.

  Until there's a backend: the sort reads what the browser heard you say (Chrome's speech
  recognition) with a keyword stand-in for the AI, falling back to a sample line where the browser
  can't transcribe. The recording stays in this tab, and only a note of each drop is kept on the
  device.
*/

export type Drop = {
  id: string;
  kind: DropKind;
  /** What you said, as best the browser heard it (or a sample line). */
  text: string;
  /** Your recording, playable in this tab; null where the browser can't record. */
  src: string | null;
  /** When you dropped it. */
  droppedAt: number;
};

/** What each kind is called on the LCD once it's dropped. */
export const DROP_LABEL: Record<DropKind, string> = { question: "Question", story: "Story", tip: "Tip" };

/**
 * No time limit: a drop counts up like a recording. It sends itself once you've gone quiet this
 * long (or you tap send). Quiet means the mic level stays under DROP_VOICE_LEVEL.
 */
export const DROP_QUIET_MS = 10_000;
/** Mic level (0–1, ordinary speech sits around 0.3–0.8) that counts as you talking. */
export const DROP_VOICE_LEVEL = 0.12;
/** Shorter than this and it was a slip of the finger: nothing is dropped. */
export const DROP_MIN_MS = 1000;
/** How long the LCD says it's sorting, then how long it shows what was dropped. */
export const DROP_SORT_MS = 900;
export const DROP_SHOW_MS = 2600;

/**
 * Stand-in for the AI sort: a question if it asks something, a tip if it's advice about the road
 * (a lane, a stop, something to watch for), otherwise a story. The real one reads the whole transcript.
 */
export function sortDrop(text: string): DropKind {
  const t = text.trim().toLowerCase();
  if (t.endsWith("?")) return "question";
  if (/^(who|what|where|when|why|how|which|anyone|anybody|does|do|did|is|are|was|should|can|could|would|will|have|has)\b/.test(t)) return "question";
  if (/\b(anyone know|does anyone|what do you|what's your|what is your|tell me|i wonder)\b/.test(t)) return "question";
  if (/^(heads up|tip|pro tip|fyi|watch out|careful|avoid|skip|try|get|stop at|take|stay|don't|do not|never|always|make sure)\b/.test(t)) return "tip";
  if (/\b(heads up|watch out|look out|speed trap|lane ends|left lane|right lane|exit|cheaper|cheapest|best (gas|food|coffee|burrito|tacos?)|recommend|worth (it|a stop)|don't miss|traffic|parking|rest stop|gas station)\b/.test(t)) return "tip";
  return "story";
}

/** Sample lines for when the browser can't transcribe, so every kind shows up. */
const SAMPLES = [
  "Anyone know a good taco spot off the next exit?",
  "My dad taught me to drive on this exact stretch, every Sunday morning.",
  "Heads up, the left lane ends right after this bridge.",
  "What's the best song you've ever heard on a night drive?",
  "We broke down here once and a stranger stopped and fixed our tire.",
  "Get gas at the next exit, it's way cheaper than downtown.",
];

const STORE = "svsd.drops";

type Kept = Omit<Drop, "src">;

function load(): Kept[] {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "[]") as Kept[];
  } catch {
    return [];
  }
}

/** The next sample line: carries on from however many drops this device has made. */
export function sampleTranscript(): string {
  return SAMPLES[load().length % SAMPLES.length];
}

/** Keep a note of it on this device until there's somewhere to send it (not the audio). Latest 50. */
export function saveDrop({ src, ...kept }: Drop) {
  void src;
  try {
    localStorage.setItem(STORE, JSON.stringify([...load(), kept].slice(-50)));
  } catch {
    // Private mode or full storage: the drop still shows on the map for this trip.
  }
}

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

/**
 * Listen along while you record, so the drop can be sorted by what you said. Resolves with the
 * transcript when stopped ("" where the browser has no speech recognition, or heard nothing).
 */
export function transcribe(): { stop: () => Promise<string> } {
  const w = typeof window === "undefined" ? null : (window as unknown as Record<string, (new () => Recognition) | undefined>);
  const Ctor = w?.SpeechRecognition ?? w?.webkitSpeechRecognition;
  if (!Ctor) return { stop: async () => "" };
  let text = "";
  let ended = false;
  let finish = () => {};
  const done = new Promise<void>((resolve) => (finish = resolve));
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (e) => {
    text = Array.from(e.results, (r) => r[0]?.transcript ?? "").join(" ");
  };
  rec.onend = () => {
    ended = true;
    finish();
  };
  rec.onerror = () => {
    ended = true;
    finish();
  };
  try {
    rec.start();
  } catch {
    ended = true;
  }
  return {
    stop: async () => {
      if (!ended) {
        rec.stop();
        // Never hold the sort up for long waiting on the last words.
        await Promise.race([done, new Promise((r) => setTimeout(r, 700))]);
      }
      return text.trim();
    },
  };
}
