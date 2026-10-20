/*
  The guided demo for the submission site (desktop only). A visitor plays one of the six flows from
  the About column; inside the phone only the next thing to tap works, and if they wait a few
  seconds a round bubble shows where it is (components/guide/Guide). The phone (real touch) keeps
  the two-finger hold and none of this.

  Each flow's `next` looks at the phone screen as it is right now and returns what to tap next:
  `target` gets the bubble, `allow` can also be tapped but gets no bubble (the avatar choices, the
  permission switches). Nothing returned = nothing to tap: the flow is talking or driving.
*/

/** 1 to 6 are the guided flows; 7 is All flows, the free play-through with every key working. */
export type FlowNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const ALL_FLOWS = 7;

export type GuideStep = {
  /** What gets the bubble. */
  target?: Element | null;
  /** A word under the bubble, for fields ("Type any number"). */
  hint?: string;
  /** Also tappable, no bubble. */
  allow?: (Element | null)[];
  /** The flow is over: the bubble moves to the next flow in the About column. */
  done?: boolean;
};

export type GuideContext = {
  path: string;
  params: URLSearchParams;
  /** Remembered things that happened earlier in this run of the flow. */
  seen: Set<string>;
  /** First element on the phone screen that matches and can be seen. */
  find: (selector: string, text?: RegExp) => HTMLElement | null;
  findAll: (selector: string) => HTMLElement[];
  /** The phone screen's words, for states with nothing to select on. */
  text: () => string;
};

export type GuideFlow = {
  n: FlowNumber;
  title: string;
  blurb: string;
  next: (ctx: GuideContext) => GuideStep;
};

const enabled = (el: HTMLElement | null) =>
  el && !(el as HTMLButtonElement).disabled && el.getAttribute("aria-disabled") !== "true" ? el : null;

export const GUIDE_FLOWS: GuideFlow[] = [
  {
    n: 1,
    title: "Getting on the road",
    blurb: "Sign up in under a minute: three cards, a phone number, and a roadside avatar that keeps you anonymous.",
    next: ({ path, find, findAll }) => {
      if (path === "/welcome") return { target: find("button[aria-label^='Caravan is loading']") };
      if (path === "/overview") return { target: find("a", /^\s*(NEXT|LET.S GO)/) };
      if (path === "/profile") {
        const phone = find("input[aria-label='Phone number']");
        if (phone) {
          const submit = enabled(find("button[type='submit']"));
          return submit ? { target: submit, allow: [phone] } : { target: phone, hint: "Type any number" };
        }
        const code = find("input[aria-label='Verification code']");
        if (code) return { target: code, hint: "Any 6 digits" };
        const save = find("button", /^\s*SAVE\s*$/);
        if (save) return { target: enabled(save), allow: [...findAll("[role='radiogroup'][aria-label='Character'] button"), find("button[aria-label='Random username']"), find("input")] };
        const go = find("button", /^\s*(CONTINUE|LET'S GO|DONE)\s*$/);
        if (go) return { target: go, allow: findAll("[role='switch']") };
      }
      if (path === "/") return { done: true };
      return {};
    },
  },
  {
    n: 2,
    title: "Stories on the road",
    blurb: "Pick where you're going and drive. A story another driver left at a spot on your road plays as you pass it.",
    next: ({ path, find, findAll, seen, text }) => {
      if (path === "/") {
        const start = enabled(find("a[href='/journey/starting']", /Start journey/i));
        if (start) return { target: start };
        const results = findAll("#destination ~ div button");
        if (results.length) return { target: results[0], allow: [...results, find("#destination"), find("button[aria-label='Clear destination']")] };
        return { target: find("#destination"), hint: "Type UCLA", allow: [find("button[aria-label='Clear destination']")] };
      }
      if (path !== "/radio") return {};
      const start = find("button", /^\s*START JOURNEY\s*$/);
      if (start) return { target: start };
      // NightOwl's story has played and asked for a reply; once the drive carries on, it's over.
      const lcd = text();
      if (/would you like to reply/i.test(lcd)) seen.add("asked");
      if (seen.has("asked") && !/message from @nightowl/i.test(lcd)) return { done: true };
      return {};
    },
  },
  {
    n: 3,
    title: "Company: one stranger",
    blurb: "Flip the switch and pick a mood. Caravan matches you with a stranger whose road overlaps yours, and you talk.",
    next: ({ path, find }) => {
      if (path !== "/radio") return {};
      const intent = find("[role='radio'][aria-label='Get something off my chest']");
      if (intent) return { target: intent };
      const sw = find("[role='switch'][aria-label='Radio power'][aria-checked='false']");
      if (sw && !find("button[aria-label='End call'], button[aria-label='Stop connecting']")) return { target: sw };
      return {};
    },
  },
  {
    n: 4,
    title: "Answer a question",
    blurb: "A question left on the road unlocks. Say yes and answer out loud, then leave a drop of your own for the next driver.",
    next: ({ path, find, seen, text }) => {
      if (path !== "/radio") return {};
      const respond = enabled(find("button[aria-label='Respond to the question']"));
      if (respond) return { target: respond };
      if (/REPLY SENT/.test(text())) seen.add("answered");
      if (!seen.has("answered")) return {};
      const send = enabled(find("button[aria-label='Drop it here']"));
      if (send) {
        seen.add("dropping");
        return { target: send };
      }
      const drop = find("button[aria-label='Leave a drop']");
      // The drop has gone out (or was thrown away) and the key is back: the flow's over.
      if (seen.has("dropping") && enabled(drop)) return { done: true, allow: [drop] };
      return { target: enabled(drop) };
    },
  },
  {
    n: 5,
    title: "Your drive becomes a story",
    blurb: "Pull up at your destination. Caravan thanks you for riding, then shows the drive as a recap of everyone you met.",
    next: ({ path, find }) => {
      if (path === "/trip") return { done: true, allow: [find("a", /VIEW ALL/)] };
      if (path !== "/radio") return {};
      // Arrived: END JOURNEY is the whole row (no Drop key beside it).
      if (find("button[aria-label='Leave a drop']")) return {};
      return { target: find("button", /^\s*END JOURNEY\s*$/) };
    },
  },
  {
    n: 6,
    title: "Night mode",
    blurb: "After dark the screen dims to green. Caravan checks you're awake and, if you don't answer, reroutes you to a rest area.",
    next: ({ path, find, seen }) => {
      if (path !== "/radio") return {};
      const back = find("button[aria-label='Back on the road']");
      if (back) {
        seen.add("parked");
        return { target: back };
      }
      if (seen.has("parked")) return { done: true };
      return { allow: [find("button[aria-label^='Exit rerouting']")] };
    },
  },
];

/**
 * The list in the About card: the six guided flows, then All flows. All flows has no guide entry,
 * so nothing is locked and no bubble shows: a visitor signed in with the demo account, on the
 * home screen, free to tap through everything we made. Flow 6's end points its bubble here.
 */
export const PANEL_FLOWS: { n: FlowNumber; title: string }[] = [
  ...GUIDE_FLOWS.map(({ n, title }) => ({ n, title })),
  { n: ALL_FLOWS, title: "All flows" },
];

const FLOW_KEY = "svsd-guide-flow";
const FORCE_KEY = "svsd-guide";
export const GUIDE_WIDE = "(min-width: 1024px)";

/** Hosted site on a wide screen; locally only after ?guide=on (so editing isn't blocked). */
export function guideActive() {
  if (typeof window === "undefined") return false;
  let forced = false;
  try {
    // ?guide=on / ?guide=off sets it for this browser (local testing).
    const asked = new URLSearchParams(location.search).get("guide");
    if (asked === "on" || asked === "off") localStorage.setItem(FORCE_KEY, asked);
    forced = localStorage.getItem(FORCE_KEY) === "on";
  } catch {}
  return (process.env.NODE_ENV === "production" || forced) && matchMedia(GUIDE_WIDE).matches;
}

const listeners = new Set<() => void>();

export function subscribeGuide(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

/** The flow being played, for this tab (null before any). */
export function currentFlow(): FlowNumber | null {
  try {
    const n = Number(sessionStorage.getItem(FLOW_KEY));
    return n >= 1 && n <= ALL_FLOWS ? (n as FlowNumber) : null;
  } catch {
    return null;
  }
}

/** Run counter: every start, even of the same flow, forgets what was seen. */
let run = 0;
export const guideRun = () => run;

export function setCurrentFlow(n: FlowNumber) {
  try {
    sessionStorage.setItem(FLOW_KEY, String(n));
  } catch {}
  run++;
  listeners.forEach((l) => l());
}

/** The About column asks for a flow; the Dial Kit (which knows how to start each one) does it. */
export const FLOW_EVENT = "caravan:play-flow";
export function requestFlow(n: FlowNumber) {
  window.dispatchEvent(new CustomEvent<FlowNumber>(FLOW_EVENT, { detail: n }));
}
