/*
  Saying yes or no out loud to the radio ("Would you like to reply? Reply with yes or no").
  The mic opens as soon as the radio has asked. Where the browser can recognise speech (Chrome,
  Edge, Safari) it listens for a yes or a no; where it can't, any voice counts as yes, since
  speaking up is the point and the skip key is always there for no.
*/

export type YesNo = "yes" | "no";

const YES = /\b(yes|yeah|yea|yep|yup|sure|ok|okay|reply|respond|answer|go ahead|of course)\b/i;
const NO = /\b(no|nope|nah|not now|skip|pass|no thanks)\b/i;

/** What the words mean, if anything: no wins over yes ("yes, no, not now" is a no). */
export function heard(text: string): YesNo | null {
  if (NO.test(text)) return "no";
  if (YES.test(text)) return "yes";
  return null;
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
  abort: () => void;
};

function recognizer(): (new () => Recognition) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, (new () => Recognition) | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Whether this browser can tell a yes from a no (otherwise any voice is a yes). */
export const canRecognise = () => !!recognizer();

/**
 * Listen for a spoken yes or no. Calls `onAnswer` once, then stops. Returns stop, for when the
 * radio gives up waiting or you press a key instead.
 */
export function listenYesNo(onAnswer: (answer: YesNo) => void): () => void {
  const Ctor = recognizer();
  if (!Ctor) return () => {};
  let done = false;
  let rec: Recognition | null = null;
  const answer = (a: YesNo) => {
    if (done) return;
    done = true;
    rec?.abort();
    onAnswer(a);
  };
  // Recognition can end on its own after a pause; start it again until there's an answer.
  const start = () => {
    if (done) return;
    rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const text = Array.from(e.results, (r) => r[0]?.transcript ?? "").join(" ");
      const a = heard(text);
      if (a) answer(a);
    };
    rec.onend = () => setTimeout(start, 0);
    rec.onerror = () => {};
    try {
      rec.start();
    } catch {}
  };
  start();
  return () => {
    done = true;
    rec?.abort();
  };
}
