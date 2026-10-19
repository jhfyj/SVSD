"use client";

import { FlagCheckered, GearSix, MapPinPlus, Microphone, MicrophoneSlash, NavigationArrow, PaperPlaneRight, PhoneDisconnect, RoadHorizon } from "@phosphor-icons/react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { DROP_LABEL, type Drop } from "@/lib/radio/drops";
import { DropLcd, LeftBehind } from "./Drop";
import { useDrop } from "./useDrop";
import type { CharacterId } from "@/lib/profile/characters";
import { useArrived } from "@/lib/trip/useArrived";
import { announce as announceArrival } from "@/lib/trip/arrival";
import { loadTrip, saveTrip } from "@/lib/trip/trip";
import { cue, replySent } from "@/lib/sound";
import type { DemoDrive, Pickup } from "@/lib/demo/storyDrive";
import { CollectedTally, CollectFlight } from "../drops/CollectFlight";
import type { DropKind } from "../drops/glyphs";
import { NavMap } from "../nav/NavMap";
import { useJourney } from "@/lib/journey/session";
import { MapMarker, type MarkerColor } from "../ui/MapMarker";
import { cn } from "../ui/cn";
import { HardwareButton } from "./HardwareButton";
import { LcdScreen } from "./LcdScreen";
import { Led } from "./Led";
import { introLines, RadioLcd, type CallState } from "./RadioLcd";
import { RadioSettings } from "./RadioSettings";
import { RadioCallSettings, type ReportReason } from "./RadioCallSettings";
import { blockHandle, CALL_INTENTS, saveRadioSettings, useRadioSettings, type CallIntent } from "@/lib/radio-settings";
import { playVoice, type Level } from "@/lib/radio/voice";
import { QUESTION_PROMPT, QUESTION_UNLOCKED, REPLY_PROMPT, sayIntro, START_TIMEOUT_MS, THANK_YOU } from "@/lib/radio/scriptVoice";
import {
  MOTHLIGHT_HOPE_SO,
  MOTHLIGHT_RECITAL,
  NIGHTOWL_AHH_SHUCKS,
  NIGHTOWL_BURRITO,
  NIGHTOWL_FEEL_YOUR_PAIN,
  NIGHTOWL_WHAT_GOT_YOU_THROUGH,
  URMOM_DRIVING_TO_SF,
  YOU_WAYMO_SHOWDOWN,
} from "@/lib/radio/demoVoices";
import { IntentKeys } from "./IntentKeys";
import { formatCountdown, HANG_UP_RULE, recordHangUp, timedOutUntil, type HangUpRule } from "@/lib/radio/hangups";
import { MESSAGE_COLOR, SAMPLE_MESSAGES, type RouteMessage } from "@/lib/radio/messages";
import { MessageGlow, MessageKeys, MessageLcd } from "./RouteMessage";
import { useRouteMessage } from "./useRouteMessage";
import { RockerSwitch } from "./RockerSwitch";
import { Nightfall, NightLcd } from "./NightDrive";
import { useNightDrive } from "./useNightDrive";
import type { NightStart } from "@/lib/radio/nightDrive";

/** Mic and Settings during a call (and Drop/Settings beside a message): square keys, as tall as the row (70px). */
const CALL_KEY = "w-[70px] shrink-0";

/** Mocked strangers for the calls after the first, until there's a backend matching people. */
const NEXT_CALLERS: { handle: string; character: CharacterId }[] = [
  { handle: "@Nightowl88", character: "frog" },
  { handle: "@Hufflepuff23", character: "squirrel" },
  { handle: "@Roadrunner5", character: "turtle" },
  { handle: "@Mile84", character: "deer" },
];

/** Where the map sits inside the device body (the inner screen). */
const SCREEN = { left: 14, top: 64, width: 365, height: 509 };

export type Traveller = {
  id: string;
  color: MarkerColor;
  label: string;
  /** On the live map: metres along the route from you (ahead is positive, 0 is you). */
  ahead: number;
  /** On the placeholder map: the Figma position, in device coordinates (393 × 852). */
  x: number;
  y: number;
};

/** Placeholder travellers until there are real ones: spread along the route around you. */
export const DEFAULT_TRAVELLERS: Traveller[] = [
  { id: "orange", color: "orange", label: "Traveller ahead", ahead: 900, x: 225.8, y: 87.1 },
  { id: "magenta", color: "magenta", label: "Traveller", ahead: 250, x: 206, y: 256.1 },
  { id: "lime", color: "lime", label: "You", ahead: 0, x: 253.6, y: 287.83 },
  { id: "sky", color: "sky", label: "Traveller behind", ahead: -500, x: 118.84, y: 431.49 },
];

export type RadioScreenProps = {
  /** How a call ends up after connecting (mocked until there's a backend). */
  outcome?: "connected" | "lost";
  /** How long "Connecting..." shows before the outcome, in ms. */
  connectMs?: number;
  /** You, as the radio introduces you to them. */
  me?: string;
  /** How many miles of road you share with them (mocked until there's matching on routes). */
  sharedMiles?: number;
  /** The person you get connected to and their character (mocked). */
  peer?: string;
  peerCharacter?: CharacterId;
  /** Pin whether they're talking (Storybook). Otherwise it's mocked: they talk, pause, talk. */
  speaking?: boolean;
  /**
   * Where the radio starts. Off shows Start journey (End journey once it's under way), Drop and
   * Settings; on a call it's End call, Mic and Settings (no Drop).
   */
  defaultState?: CallState;
  /** Shorthand for starting connected. */
  defaultOn?: boolean;
  /** After the radio introduces you both, when the other person's audio should start. */
  onConnected?: (peer: string) => void;
  travellers?: Traveller[];
  onEndCall?: () => void;
  /**
   * Whether the journey is already under way. A new journey opens with Start journey: the map
   * waits at your start and nothing on the road plays until you press it. Defaults to started
   * whenever `arrived` is pinned (Storybook).
   */
  started?: boolean;
  /**
   * true: at the destination now (the Finished journey stories). false: never arrive, so the
   * call buttons always show (every other story). Unset: you arrive once the drive's time is up.
   */
  arrived?: boolean;
  /** End journey, mid-drive or at the destination: on to the trip recap. */
  onEndTrip?: () => void;
  /**
   * How many hang-ups, how fast, set off the timeout and how long it lasts. `null` turns it off:
   * hang-ups don't count and no timeout applies (every dial kit flow except Hang-up timeout).
   */
  hangUpRule?: HangUpRule | null;
  /** Messages and questions left along the route. They play as you pass them, while the radio's off. */
  messages?: RouteMessage[];
  /** Play this message as soon as the screen opens (Storybook, the dial kit). */
  defaultMessage?: RouteMessage;
  /**
   * Without a route to drive, how often you "pass" the next message, in ms. The first comes sooner.
   * (On real roads they're sparse: one every 20–30 minutes by day, 8–10 at night.)
   */
  messageEveryMs?: number;
  /** A scripted drive for the story-unlock demo, with pickups to collect along it. */
  demo?: DemoDrive;
  /**
   * Night mode's script (Flow 6), from sunset, the check-in, or the rest area. Plays by itself.
   * The amber look itself needs no prop: at night the radio is always amber.
   */
  night?: NightStart;
  /** Called under the relight flicker at sunset: switch the app to the night theme here. */
  onNightfall?: () => void;
  /** Your own character: keeping you company on the idle LCD, and dozing when Night mode tells you to rest. */
  meCharacter?: CharacterId;
  /** The scripted NightOwl and Mothlight exchange, while keeping the navigation map visible. */
  companyDemo?: boolean;
  /** The scripted question pickup and visual-only answer demo. */
  questionDemo?: boolean;
  /** The continuous Start Journey story flow: pickup, 14-second story animation, spoken reply prompt. */
  storyDemo?: boolean;
  className?: string;
};

/** Night mode phases that put something on the LCD (the sunset itself keeps the usual LCD). */
const NIGHT_LCD = ["nightOn", "night", "checkin", "listening", "nothing", "rerouting", "stopped"];

/** Flow 3 (5 · Company): the four turns after the intro, in the drivers' own recorded voices. */
const COMPANY_TURNS = [
  { speaker: "Mothlight", character: "rabbit" as const, text: "Home to catch my daughter’s recital. I’ve missed the last two. Just got off a twelve-hour shift.", voice: MOTHLIGHT_RECITAL },
  { speaker: "NightOwl", character: "squirrel" as const, text: "Ah shucks, you’ll make this one.", voice: NIGHTOWL_AHH_SHUCKS },
  { speaker: "Mothlight", character: "rabbit" as const, text: "I hope so. How about you?", voice: MOTHLIGHT_HOPE_SO },
  { speaker: "NightOwl", character: "squirrel" as const, text: "Just home. I’m a truck driver, so I can feel your pain with the long drives.", voice: NIGHTOWL_FEEL_YOUR_PAIN },
];
const ROAD_QUESTION = "What got you through today?";
/** Flow 4: NightOwl's question, answered with the same reply recorder as a message on the road. */
const ROAD_QUESTION_MESSAGE: RouteMessage = {
  id: "nightowl-road-question",
  kind: "question",
  from: "@NightOwl",
  character: "squirrel",
  src: NIGHTOWL_WHAT_GOT_YOU_THROUGH,
  recorded: true,
  transcript: ROAD_QUESTION,
  at: 0,
};
/** How long "Reply sent" stays on the LCD after @urmom6767's answer. */
const ANSWER_SENT_MS = 2600;
/** The green burst that carries your reply out, rising from the bottom and fading. */
const SENT_BURST_MS = 1100;
/** Flow 4, after "Would you like to respond?": the beat the radio waits for the yes before the answer plays. */
const ANSWER_BEAT_MS = 1500;

/** Flow 2: how long "Would you like to reply to this message?" stays up before the drive carries on. */
const STORY_PROMPT_HOLD_MS = 4000;

/** A beat of quiet between one message ending and the next one tuning in. */
const MESSAGE_GAP_MS = 2500;

/** Where collected pickups land: the counter's icon in the LCD's top-left corner, in the radio's own px. */
const LCD_TALLY = { x: 156 + 38, y: 585 + 18 + 18 };

type Flight = { id: string; kind: DropKind; from: { x: number; y: number }; pickup: Pickup };
/**
 * Flow 4 (6 · A question on the road), as the script runs it: the radio's unlock line, NightOwl
 * asks the question, the radio asks "Would you like to respond?", the mic waits for your yes, then
 * @urmom6767's recorded answer rises from the bottom as your reply, and it's sent.
 */
type QuestionStage = "driving" | "unlocking" | "playing" | "prompt" | "reply-ready" | "answering" | "sent";
type StoryStage = "driving" | "story" | "prompt" | "reply-ready";

const BURRITO_TRANSCRIPT = "Whoever’s hearing this, there’s a gas station there that sells the best breakfast burrito in California. I’m serious. I’ve been driving for twenty-six years and I plan my whole week around this burrito.";
const BURRITO_MESSAGE: RouteMessage = { id: "nightowl-burrito", kind: "message", from: "@NightOwl", character: "squirrel", src: NIGHTOWL_BURRITO, recorded: true, transcript: BURRITO_TRANSCRIPT, at: 0.5 };

/**
 * Plays one recorded step of a demo flow: its voice drives the glow through `level`, and `next`
 * runs when it ends, or if it hasn't started after START_TIMEOUT_MS (blocked audio never stalls
 * the flow). Returns the cleanup for the effect that started it.
 */
function playStep(src: string, level: RefObject<Level | null>, next: () => void) {
  const v = playVoice(src, true);
  level.current = v.level;
  let over = false;
  const go = () => {
    if (over) return;
    over = true;
    next();
  };
  const held = setTimeout(go, START_TIMEOUT_MS);
  void v.started.then(() => clearTimeout(held));
  v.done.then(go, go);
  return () => {
    over = true;
    clearTimeout(held);
    v.stop();
    level.current = null;
  };
}

/** One continuous casing: the top bar, the frame around the map and the console are the same piece. */
const casing =
  "[background:var(--panel-noise),var(--casing-gradient)] shadow-[var(--panel-highlight)]";

/** The "Connected" radio screen (Figma node 123:246): the navigation map on an inset screen above the radio console. */
export function RadioScreen({
  outcome = "connected",
  connectMs = 3000,
  me = "@you",
  sharedMiles = 84,
  peer = "@sunny_side",
  peerCharacter = "cat",
  speaking: speakingPinned,
  defaultOn = false,
  defaultState = defaultOn ? "connected" : "off",
  onConnected,
  travellers = DEFAULT_TRAVELLERS,
  onEndCall,
  started: defaultStarted,
  arrived: forceArrived,
  onEndTrip,
  hangUpRule = HANG_UP_RULE,
  messages = SAMPLE_MESSAGES,
  defaultMessage,
  messageEveryMs = 30_000,
  demo,
  night,
  onNightfall,
  meCharacter = "raccoon",
  companyDemo = false,
  questionDemo = false,
  storyDemo = false,
  className,
}: RadioScreenProps) {
  const [state, setState] = useState<CallState>(defaultState);
  const radioOn = state !== "off";
  // When the call comes through, the radio introduces you both (two lines, one LCD page each).
  const [greeting, setGreeting] = useState(companyDemo && defaultState === "connected");
  const [introPage, setIntroPage] = useState<0 | 1>(0);
  const [conversationIndex, setConversationIndex] = useState(-1);
  const callVoiceLevel = useRef<Level | null>(null);
  // Who you're talking to. The first call is `peer`; each End call finds someone new (mocked).
  const [calls, setCalls] = useState(0);
  // Anyone you've reported never comes up again.
  const { blocked, intent, intentSet } = useRadioSettings();
  // Flipping the radio on asks what you're up for; that's what matches you (with your stretch of road).
  const pickIntent = (id: CallIntent) => {
    saveRadioSettings({ intent: id, intentSet: true });
    setState("connecting");
  };
  const intentInfo = CALL_INTENTS.find((t) => t.id === intent) ?? CALL_INTENTS[0];
  const nextCallers = NEXT_CALLERS.filter((c) => !blocked.includes(c.handle));
  const caller =
    calls === 0 || !nextCallers.length
      ? { handle: peer, character: peerCharacter }
      : nextCallers[(calls - 1) % nextCallers.length];
  // Taking a break: your mic is off and they hear you're on a break (mocked).
  const [onBreak, setOnBreak] = useState(false);
  // End call hangs up and goes straight back to Connecting to find you a new person.
  // The key stays pressed in until that next person connects (or the radio stops), then pops back up.
  const [hangingUp, setHangingUp] = useState(false);
  // Hang up on too many people in a row and the radio takes a break: nobody connects until it ends.
  const [timeoutUntil, setTimeoutUntil] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const hangUp = (counts: boolean) => {
    setGreeting(false);
    setOnBreak(false);
    setSettingsOpen(false);
    setCalls((n) => n + 1);
    onEndCall?.();
    const until = counts && hangUpRule ? recordHangUp(hangUpRule) : null;
    if (until) {
      setTimeoutUntil(until);
      setNow(0); // The countdown's first tick fills this in.
      setHangingUp(false);
      setState("timeout");
      cue("error", { theme: "mech" });
      return;
    }
    setHangingUp(true);
    setState("connecting");
  };
  const endCall = () => hangUp(true);
  // Report: they're blocked from matching you again, then the radio hangs up and finds someone new.
  // Reporting never counts toward the hang-up timeout.
  const report = (reason: ReportReason) => {
    blockHandle(caller.handle);
    void reason; // Sent with the report once there's a backend.
    hangUp(false);
  };
  const [micMuted, setMicMuted] = useState(false);
  // Drop (where Speaker used to be): one key leaves something on the road for whoever drives it next.
  // Tap to record, tap again to drop it here; it's sorted into a message or a question and left on the map.
  // Flow 4: after answering the question, Drop tells your own story from a recording (no mic).
  const drop = useDrop(questionDemo ? YOU_WAYMO_SHOWDOWN : undefined);
  const dropRecording = drop.phase === "recording";
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Start journey: until you press it the map waits at your start and nothing on the road plays.
  // Pressing it starts the drive's clock (arrival counts from here, not from setting the trip up).
  const [started, setStarted] = useState(defaultStarted ?? forceArrived !== undefined);
  const startJourney = () => {
    setStarted(true);
    const trip = loadTrip();
    if (trip) {
      saveTrip({ ...trip, startedAt: Date.now() });
      announceArrival(false);
    }
  };
  // End journey: the whole radio slides down out of view, then on to the trip recap.
  // There's no pause: a journey is either under way or over.
  const [leaving, setLeaving] = useState(false);
  const leave = () => onEndTrip?.();
  const endJourney = () => {
    if (leaving) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return leave();
    setLeaving(true);
  };
  const root = useRef<HTMLDivElement>(null);

  // Pickups collected on the map fly into the LCD, which keeps count.
  const [flights, setFlights] = useState<Flight[]>([]);
  const [collected, setCollected] = useState<Partial<Record<DropKind, number>>>({});
  const [tallyFlash, setTallyFlash] = useState(0);
  const [questionStage, setQuestionStage] = useState<QuestionStage>("driving");
  const [storyStage, setStoryStage] = useState<StoryStage>("driving");
  const onCollect = (pickup: Pickup, at: { x: number; y: number }) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return;
    // The radio can be drawn scaled (a narrow window), so map the page's px back to its own.
    const k = box.width / 393;
    setFlights((f) => [...f, { id: pickup.id, kind: pickup.kind, pickup, from: { x: (at.x - box.left) / k, y: (at.y - box.top) / k } }]);
  };
  // Which pickups are in the tally, so replying to one can take its icon back out.
  const tallied = useRef(new Map<string, DropKind>());
  const landed = (flight: Flight) => {
    setFlights((f) => f.filter((x) => x.id !== flight.id));
    tallied.current.set(flight.pickup.id, flight.kind);
    setCollected((c) => ({ ...c, [flight.kind]: (c[flight.kind] ?? 0) + 1 }));
    setTallyFlash((n) => n + 1);
    if (flight.pickup.id === "nightowl-burrito") {
      if (storyDemo) setStoryStage("story");
      else message.play(BURRITO_MESSAGE);
    }
    if (flight.pickup.id === "nightowl-road-question") setQuestionStage("unlocking");
  };
  // At the destination the button row becomes a single End journey.
  // Not before Start journey: the drive's clock hasn't begun.
  const arrived = useArrived(forceArrived) && started;
  // Night mode: the radio checks in with you, and tells you to stop when your answers slow down.
  const nightDrive = useNightDrive({ start: night, onNightfall });
  const nightTalking = nightDrive.busy && !radioOn;

  // Messages on the road. Each plays once, as you pass it, and only while the radio's off: they never
  // talk over a live call. Pass one mid-call and it's gone; pass two close together and they queue.
  // No Speaker key any more: messages play at the phone level, the way Speaker started.
  const message = useRouteMessage({ speaker: false });
  const messageOn = message.phase !== "idle" && !radioOn;
  // Your reply glows in your own marker's colour.
  const youColor = travellers.find((t) => t.ahead === 0)?.color ?? "lime";
  // Reply sent to something you picked up (Flow 2's book, Flow 4's question): it's answered, so it
  // comes out of the LCD's count. The count is hidden while you record, so at REPLY SENT the corner
  // simply comes back without it. Skipping or saying no keeps it.
  const repliedTo = message.phase === "sent" ? message.message?.id : undefined;
  useEffect(() => {
    const kind = repliedTo ? tallied.current.get(repliedTo) : undefined;
    if (!repliedTo || !kind) return;
    tallied.current.delete(repliedTo);
    setCollected((c) => ({ ...c, [kind]: Math.max(0, (c[kind] ?? 1) - 1) }));
  }, [repliedTo]);
  const [passed, setPassed] = useState<string[]>(() => (defaultMessage ? [defaultMessage.id] : []));
  const [queue, setQueue] = useState<RouteMessage[]>(() => (defaultMessage ? [defaultMessage] : []));
  const ahead = useMemo(
    () =>
      messages
        .filter((m) => !passed.includes(m.id))
        .map((m) => ({ id: m.id, at: m.at, color: MESSAGE_COLOR[m.kind], label: `${m.kind === "question" ? "Question" : "Message"} from ${m.from}` })),
    [messages, passed],
  );
  // Stories wait while Night mode talks to you, and stay paused at the rest area until you're back.
  // Nothing on the road plays before Start journey.
  const listening = started && state === "off" && !arrived && !leaving && !nightDrive.busy;
  const reach = useCallback(
    (id: string) => {
      const m = messages.find((x) => x.id === id);
      if (!m || passed.includes(id)) return;
      setPassed((p) => [...p, id]);
      if (listening) setQueue((q) => [...q, m]);
    },
    [messages, passed, listening],
  );
  // No route to drive past them on (Storybook, no trip set up): pass the next one every so often instead.
  const onRoute = Boolean(useJourney()?.route);
  const nextAhead = ahead[0]?.id;
  useEffect(() => {
    if (onRoute || !nextAhead || !listening || messageOn) return;
    const t = setTimeout(() => reach(nextAhead), passed.length ? messageEveryMs : Math.min(messageEveryMs, 6000));
    return () => clearTimeout(t);
  }, [onRoute, nextAhead, listening, messageOn, reach, passed.length, messageEveryMs]);
  // Next in the queue tunes in once the radio's quiet. The first one opening the screen goes straight away.
  // A message waits while you're leaving a drop: it never talks over you.
  const { play } = message;
  const dropBusy = drop.active;
  useEffect(() => {
    if (!queue.length || messageOn || !listening || dropBusy) return;
    const t = setTimeout(() => {
      play(queue[0]);
      setQueue((q) => q.slice(1));
    }, message.message ? MESSAGE_GAP_MS : 0);
    return () => clearTimeout(t);
  }, [queue, messageOn, listening, dropBusy, play, message.message]);


  // Arriving mid-drop drops it right there (the key row turns into End trip).
  const { toggle: toggleDrop } = drop;
  useEffect(() => {
    if (arrived && dropRecording) toggleDrop();
  }, [arrived, dropRecording, toggleDrop]);
  // Reaching the destination switches the radio on by itself to thank you (ending any call or
  // message), and the drop key greys out. Starting the drive over puts it back to off.
  const wasArrived = useRef(arrived);
  useEffect(() => {
    if (arrived === wasArrived.current) return;
    // On the next tick, like the timeout countdown's first tick.
    const t = setTimeout(() => {
      wasArrived.current = arrived;
      if (!arrived) {
        setState((s) => (s === "thanks" ? "off" : s));
        return;
      }
      setState("thanks");
      setGreeting(false);
      setHangingUp(false);
      setOnBreak(false);
      setSettingsOpen(false);
      setTimeoutUntil(null);
    }, 0);
    return () => clearTimeout(t);
  }, [arrived]);
  // The thank-you is said out loud too, in the radio's recorded voice, over whatever message was playing.
  const { skip: skipMessage } = message;
  useEffect(() => {
    if (state !== "thanks") return;
    skipMessage();
    const line = playVoice(THANK_YOU, true);
    return line.stop;
  }, [state, skipMessage]);
  // Your drops on the map: a pin per drop with its kind's icon (question, story, tip).
  const dropPins = useMemo(
    () => drop.drops.map((d: Drop) => ({ id: d.id, kind: d.kind, label: `${DROP_LABEL[d.kind]} you dropped` })),
    [drop.drops],
  );

  // Connecting: CONNECTING... on the LCD until the call comes through or drops.
  // It doesn't start searching until you've said what you're up for (the pick state comes first).
  useEffect(() => {
    if (state !== "connecting") return;
    const t = setTimeout(() => {
      setState(outcome);
      setHangingUp(false);
      // Every call starts with your mic on, even if you'd muted it on the last one.
      setMicMuted(false);
      if (outcome === "connected") {
        setIntroPage(0);
        setGreeting(true);
        cue("ready", { emphasis: "subtle", theme: "mech" });
      } else {
        cue("error", { theme: "mech" });
      }
    }, connectMs);
    return () => clearTimeout(t);
  }, [state, outcome, connectMs]);

  // Timeout: tick the countdown each second; when it runs out, the radio goes back to finding someone.
  useEffect(() => {
    if (state !== "timeout" || !timeoutUntil) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= timeoutUntil) {
        setTimeoutUntil(null);
        setState("connecting");
      }
    };
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [state, timeoutUntil]);

  // Picking with a remembered intent: keep it after 3 seconds, so turning on stays one motion while driving.
  useEffect(() => {
    if (state !== "pick" || !intentSet || companyDemo) return;
    const t = setTimeout(() => setState("connecting"), 3000);
    return () => clearTimeout(t);
  }, [state, intentSet, companyDemo]);

  // The radio introduces you both out loud, a page on the LCD per line, then their audio starts.
  // Pairs in the demo script use the recorded voice (lib/radio/scriptVoice); others, the browser's speech.
  useEffect(() => {
    if (!greeting) return;
    let live = true;
    const line = sayIntro(me, caller.handle, sharedMiles, introLines(me, caller.handle, sharedMiles), (i) => {
      if (i > 0) setIntroPage(1);
    });
    void line.done.then(() => {
      if (!live) return;
    const startedAt = performance.now();
    callVoiceLevel.current = () => {
      const t = (performance.now() - startedAt) / 115;
      return 0.18 + Math.max(0, Math.sin(t) * Math.sin(t * 0.37)) * 0.75;
    };
      setGreeting(false);
      onConnected?.(caller.handle);
    });
    return () => {
      live = false;
      line.stop();
      callVoiceLevel.current = null;
    };
  }, [greeting, caller.handle, onConnected, me, sharedMiles]);

  // In this demo, stay with the navigation map and alternate the two drivers' turns automatically.
  useEffect(() => {
    if (!companyDemo || state !== "connected" || greeting || conversationIndex !== -1) return;
    const start = setTimeout(() => setConversationIndex(0), 0);
    return () => clearTimeout(start);
  }, [companyDemo, state, greeting, conversationIndex]);

  const companyTurn = conversationIndex >= 0 ? COMPANY_TURNS[conversationIndex] : undefined;
  const companySpeaking = Boolean(companyTurn);
  // Flow 3 never opens the microphone (no permission prompt in the demo): both sides are the
  // drivers' recordings. Mothlight's come down from the top, NightOwl's (you) rise from the bottom.
  // Each turn plays that driver's recording: Mothlight's comes down from the top, NightOwl's (you)
  // rises from the bottom. The next turn starts when the recording ends.
  useEffect(() => {
    if (!companyDemo || !companyTurn) return;
    return playStep(companyTurn.voice, callVoiceLevel, () =>
      setConversationIndex((current) => (current === conversationIndex ? current + 1 : current)),
    );
  }, [companyDemo, companyTurn, conversationIndex]);
  const nightOwlTurn = companyTurn?.speaker === "NightOwl";
  // Your side of the Flow 3 call: the glow at the bottom stays up for the whole call while your
  // mic is on, and only moves on your (NightOwl's) turns. On Mothlight's turns it reads silence,
  // so her voice never lifts your glow.
  const nightOwlTurnRef = useRef(false);
  useEffect(() => {
    nightOwlTurnRef.current = nightOwlTurn;
  }, [nightOwlTurn]);
  const yourCallLevel = useRef<Level | null>(() => (nightOwlTurnRef.current ? (callVoiceLevel.current?.() ?? 0) : 0));

  // "You just unlocked a question from NightOwl." → NightOwl: "What got you through today?" →
  // "Would you like to respond?", each one after the last, then the mic opens for your yes.
  useEffect(() => {
    if (!questionDemo) return;
    if (questionStage === "unlocking") return playStep(QUESTION_UNLOCKED, callVoiceLevel, () => setQuestionStage("playing"));
    if (questionStage === "playing") return playStep(NIGHTOWL_WHAT_GOT_YOU_THROUGH, callVoiceLevel, () => setQuestionStage("prompt"));
    if (questionStage === "prompt") return playStep(QUESTION_PROMPT, callVoiceLevel, () => setQuestionStage("reply-ready"));
  }, [questionDemo, questionStage]);

  // Flow 4: after "Would you like to respond?" the radio waits a beat for the yes, then the answer
  // plays (tap RESPOND to skip the wait). It never opens the microphone, so there's no permission
  // prompt in the demo and nothing turns the voices down.
  useEffect(() => {
    if (!questionDemo || questionStage !== "reply-ready") return;
    const yes = setTimeout(() => setQuestionStage("answering"), ANSWER_BEAT_MS);
    return () => clearTimeout(yes);
  }, [questionDemo, questionStage]);

  // Your answer, as the script has it: @urmom6767's recording rises from the bottom in your colour
  // under YOUR REPLY, then it's sent (the beep and REPLY SENT, like any reply) and the question
  // comes out of the LCD's count.
  useEffect(() => {
    if (!questionDemo || questionStage !== "answering") return;
    cue("ready", { theme: "mech" });
    return playStep(URMOM_DRIVING_TO_SF, callVoiceLevel, () => setQuestionStage("sent"));
  }, [questionDemo, questionStage]);
  // Sent: the "sent" sound, a burst of your green rising from the bottom and fading as it goes out,
  // and a check mark on the LCD. The question comes out of the LCD's count.
  useEffect(() => {
    if (!questionDemo || questionStage !== "sent") return;
    replySent();
    const sentAt = performance.now();
    callVoiceLevel.current = () => {
      const t = Math.min(1, (performance.now() - sentAt) / SENT_BURST_MS);
      return t < 0.15 ? t / 0.15 : (1 - t) ** 2 / 0.72;
    };
    const kind = tallied.current.get(ROAD_QUESTION_MESSAGE.id);
    if (kind) {
      tallied.current.delete(ROAD_QUESTION_MESSAGE.id);
      setCollected((c) => ({ ...c, [kind]: Math.max(0, (c[kind] ?? 1) - 1) }));
    }
    const back = setTimeout(() => setQuestionStage("driving"), ANSWER_SENT_MS);
    return () => {
      clearTimeout(back);
      callVoiceLevel.current = null;
    };
  }, [questionDemo, questionStage]);

  // The story unlocks and NightOwl tells it, in his own recorded voice, with the glow following it.
  // When it ends the radio asks to reply.
  useEffect(() => {
    if (!storyDemo || storyStage !== "story") return;
    return playStep(NIGHTOWL_BURRITO, callVoiceLevel, () => setStoryStage("prompt"));
  }, [storyDemo, storyStage]);

  useEffect(() => {
    if (!storyDemo || storyStage !== "prompt") return;
    let live = true;
    const voice = playVoice(REPLY_PROMPT, true);
    callVoiceLevel.current = voice.level;
    void voice.done.then(
      () => live && setStoryStage("reply-ready"),
      () => live && setStoryStage("reply-ready"),
    );
    return () => {
      live = false;
      voice.stop();
      callVoiceLevel.current = null;
    };
  }, [storyDemo, storyStage]);

  // Flow 2: once the radio has asked, its question stays on the LCD for a moment, then the drive
  // carries on. It never opens the microphone (no permission prompt in the demo).
  useEffect(() => {
    if (!storyDemo || storyStage !== "reply-ready") return;
    const on = setTimeout(() => setStoryStage("driving"), STORY_PROMPT_HOLD_MS);
    return () => clearTimeout(on);
  }, [storyDemo, storyStage]);

  // Mock talking until there's real audio: they talk for a few seconds, pause, talk again.
  const [talking, setTalking] = useState(false);
  const inCall = state === "connected" && !greeting;
  useEffect(() => {
    if (!inCall || speakingPinned !== undefined) return;
    let next = true;
    let t: ReturnType<typeof setTimeout>;
    const flip = () => {
      setTalking(next);
      t = setTimeout(flip, next ? 3200 : 1800);
      next = !next;
    };
    flip();
    return () => {
      clearTimeout(t);
      setTalking(false);
    };
  }, [inCall, speakingPinned]);
  const speaking = inCall && (companyDemo ? companyTurn?.speaker === "Mothlight" : speakingPinned ?? talking);

  return (
    <div
      ref={root}
      // Radio hardware sounds mechanical: clicks, latches, detents.
      data-cuelume-theme="mech"
      className={cn(
        // radio-night: amber at night (globals.css), whatever state the radio is in.
        "radio-night relative h-[852px] w-[393px] overflow-hidden font-sans text-foreground",
        casing,
        leaving && "radio-power-off",
        className,
      )}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget && e.animationName === "radio-power-off") leave();
      }}
    >
      {/* Inner screen: the live map, recessed into the body */}
      <section
        aria-label="Route map"
        className="radio-map absolute overflow-hidden bg-[#111] shadow-[0_1px_0_rgb(255_255_255/0.12)]"
        style={SCREEN}
      >
        <NavMap
          // The map waits at your start until Start journey.
          // Before Start journey, and parked at the rest area: the dot holds still until you're back on the road.
          paused={!started || nightDrive.parked}
          travellers={travellers}
          messages={ahead}
          onReach={reach}
          drops={dropPins}
          demo={demo}
          onCollect={onCollect}
          className="absolute inset-0"
          fallback={<PlaceholderMap travellers={travellers} drops={drop.drops} />}
          // A message playing: their voice comes down from the top; your reply (or a drop) rises from the
          // bottom in your colour. It sits under the turn banner so it never hides the directions.
          overlay={
            <>
              {/* Flow 3: the radio's intro and Mothlight's turns come down from the top in purple, on
                  their scripted timing. NightOwl's turns are left to your real mic below. */}
              {companyDemo && (greeting || companySpeaking) && (
                <MessageGlow
                  mode={greeting || companyTurn?.speaker === "Mothlight" ? "voice" : "off"}
                  color="magenta"
                  level={callVoiceLevel}
                  className="inset-x-0 top-0 h-[132px]"
                />
              )}
              {/* Your mic, as a green strip along the bottom for the whole call while it's on. It only
                  rises and moves on your turns; muted or on a break, it goes away. */}
              {companyDemo && state === "connected" && (
                <MessageGlow mode={!micMuted && !onBreak ? "reply" : "off"} color={youColor} level={yourCallLevel} rest={0.07} />
              )}
              {/* A pickup (story or question) and the AI are only their colour glowing down from the top:
                  no banner, no words over the map. */}
              {/* Flow 4: the radio's unlock line in sky, then NightOwl's question in pink, both from the top. */}
              {questionDemo && (questionStage === "unlocking" || questionStage === "playing" || questionStage === "prompt") && (
                <MessageGlow
                  mode="voice"
                  color={questionStage === "playing" ? "magenta" : "sky"}
                  level={callVoiceLevel}
                  className="inset-x-0 top-0 h-[132px]"
                />
              )}
              {/* Flow 4: @urmom6767's answer rises from the bottom, as your reply. */}
              {questionDemo && (questionStage === "answering" || questionStage === "sent") && (
                <MessageGlow mode="reply" color={youColor} level={callVoiceLevel} />
              )}
              {storyDemo && (storyStage === "story" || storyStage === "prompt") && (
                <>
                  <MessageGlow mode="voice" color={storyStage === "prompt" ? "sky" : "magenta"} level={callVoiceLevel} className="inset-x-0 top-0 h-[245px]" />
                </>
              )}
              {dropRecording ? (
                <MessageGlow mode="reply" color={youColor} level={drop.level} />
              ) : nightDrive.phase === "listening" && !radioOn ? (
                // Answering the night check-in: your voice rises from the bottom, like a reply.
                <MessageGlow mode="reply" color={youColor} level={nightDrive.level} />
              ) : (
                <MessageGlow
                  mode={!messageOn ? "off" : message.phase === "recording" ? "reply" : message.phase === "sent" || message.phase === "empty" || message.phase === "noMic" ? "off" : "voice"}
                  color={message.phase === "recording" ? youColor : MESSAGE_COLOR[message.message?.kind ?? "message"]}
                  level={message.level}
                />
              )}
            </>
          }
        />
        {/* Night mode's rest area takes over the map: the road can wait. Once the route's set it
            folds to a strip, so you can see the way there. */}
        {/* Glass: inner shadow so the map reads as a screen set into the case */}
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_3px_8px_rgb(0_0_0/0.75),inset_0_0_0_1px_rgb(0_0_0/0.8)]" />
      </section>

      {/* No top bar of its own: the phone's status bar sits over the top of the casing and already
          shows the time. No power key either: End journey is how you leave. */}

      {/* Console */}
      <div className="absolute inset-x-0 top-[585px] h-[267px]">
        {/* On a call, Settings holds the call's own controls: take a break, mood, report. */}
        <RadioSettings open={settingsOpen && state !== "connected"} className="bottom-full" />
        <RadioCallSettings
          open={settingsOpen && state === "connected"}
          peer={caller.handle}
          onBreak={onBreak}
          onBreakChange={setOnBreak}
          onReport={report}
          className="bottom-full"
        />
        <div className="absolute left-[30px] top-[20px] flex items-center gap-2">
          <span className="text-[11px] font-bold text-label/80">RADIO</span>
          <Led on={state !== "off" && state !== "thanks"} tone={state === "lost" ? "error" : state === "connecting" || state === "pick" ? "connecting" : "live"} blink={state === "connecting"} />
        </div>

        <RockerSwitch className="absolute left-[26px] top-[44px]" on={radioOn}
          onChange={(on) => {
            // After you've arrived, switching on doesn't connect anyone; the LCD just thanks you.
            // Still in a hang-up timeout (even after a reload or switching off and on): wait it out.
            const until = on && !arrived && hangUpRule ? timedOutUntil() : null;
            if (until) {
              setTimeoutUntil(until);
              setNow(0); // The countdown's first tick fills this in.
            }
            // Turning on to find someone asks what you're up for first.
            setState(on ? (arrived ? "thanks" : until ? "timeout" : "pick") : "off");
            setGreeting(false);
            setHangingUp(false);
            // Flipping the switch mid-drop drops what you've said so far, right here.
            if (dropRecording) toggleDrop();
            if (on) {
              // Company on mid check-in: the radio stops asking, you've got someone to talk to.
              nightDrive.interrupt();
              // Going live ends whatever message was playing, and drops any waiting.
              message.skip();
              setQueue([]);
            }
          }}
        />
        <span className="absolute left-[81px] top-[70px] text-[11px] font-bold text-label/80">
          OFF
        </span>
        <span className="absolute left-[84px] top-[111px] text-[11px] font-bold text-label/80">
          ON
        </span>

        {/* The screen stays lit whether or not the radio is on; only the story stops. */}
        <LcdScreen className="absolute left-[156px] top-[18px] h-[130px] w-[221px]">
          {storyDemo && storyStage !== "driving" ? (
            <StoryDemoLcd stage={storyStage} />
          ) : questionDemo && questionStage !== "driving" ? (
            <QuestionDemoLcd stage={questionStage} />
          ) : drop.active && state !== "pick" ? (
            <DropLcd controls={drop} />
          ) : !radioOn && NIGHT_LCD.includes(nightDrive.phase) ? (
            <NightLcd phase={nightDrive.phase} level={nightDrive.level} character={meCharacter} />
          ) : messageOn ? (
            <MessageLcd controls={message} />
          ) : (
            <RadioLcd state={state} peerCharacter={caller.character} peer={caller.handle} greeting={greeting} intro={{ me, miles: sharedMiles, page: introPage }} hint={state === "pick" ? (!companyDemo && intentSet ? intentInfo.key : undefined) : state === "connecting" ? intentInfo.looking : undefined} speaking={speaking && !onBreak} away={onBreak} countdown={timeoutUntil && now ? formatCountdown(timeoutUntil - now) : undefined} companion={meCharacter} />
          )}
          {/* The pickup count steps aside while you record (YOUR REPLY / YOUR DROP): their heading
              sits in the same top-left corner. It comes back once you've sent. */}
          {!((messageOn && message.phase === "recording") || (drop.active && dropRecording) || (questionDemo && questionStage === "answering")) && <CollectedTally counts={collected} flash={tallyFlash} />}
        </LcdScreen>

        {arrived && (
          // Arrived: End trip is the whole key row. No Drop key, there's no road left to leave one on.
          <div className="absolute left-[26px] top-[166px] flex w-[351px]">
            <HardwareButton
              tone="end"
              className="flex-1"
              onClick={onEndTrip}
              data-cuelume-emphasis="strong"
            >
              <FlagCheckered size={24} className="opacity-80" aria-hidden />
              <span className="text-base font-bold opacity-80">END JOURNEY</span>
            </HardwareButton>
          </div>
        )}
        {/* Rerouting, the key row is one wide key, pressed in and lit: the route's already set, nothing
            to tap. Parked at the rest area, it's the way back: stories come back on, the dot moves again. */}
        {nightDrive.phase === "stopped" && !radioOn && !arrived && (
          <div className="absolute left-[26px] top-[166px] flex w-[351px]">
            <HardwareButton className="flex-1" onClick={nightDrive.backOnTheRoad} aria-label="Back on the road">
              <RoadHorizon size={24} className="opacity-80" aria-hidden />
              <span className="text-[13px] font-bold opacity-80">BACK ON THE ROAD</span>
            </HardwareButton>
          </div>
        )}
        {nightDrive.phase === "rerouting" && !radioOn && !arrived && (
          <div className="absolute left-[26px] top-[166px] flex w-[351px]">
            <HardwareButton className="flex-1" pressed aria-disabled aria-label="Rerouting to the rest area">
              <NavigationArrow size={24} aria-hidden />
              <span className="text-[13px] font-bold opacity-80">TO REST AREA</span>
            </HardwareButton>
          </div>
        )}
        {/* What you're up for: the console keys become the four intents, a 2 x 2 grid of wide keys.
            A remembered pick sits pressed in and lit, and is kept after 3 seconds. */}
        {state === "pick" && !arrived && (
          <div className="absolute left-[26px] top-[166px] flex w-[351px]">
            <IntentKeys current={!companyDemo && intentSet ? intent : undefined} onPick={pickIntent} />
          </div>
        )}
        <div className={cn("absolute left-[26px] top-[166px] flex w-[351px] gap-2", (arrived || state === "pick" || (nightDrive.resting && !radioOn)) && "hidden")}>
          {questionDemo && questionStage !== "driving" ? (
            <HardwareButton
              className="flex-1"
              // Tapping it is the same as saying yes.
              disabled={questionStage !== "reply-ready"}
              onClick={() => setQuestionStage("answering")}
              aria-label={questionStage === "reply-ready" ? "Respond to the question" : "Question"}
            >
              <span className="text-base font-bold opacity-80">
                {questionStage === "reply-ready"
                  ? "RESPOND"
                  : questionStage === "unlocking"
                  ? "QUESTION UNLOCKED"
                  : questionStage === "answering"
                  ? "REPLYING"
                  : questionStage === "sent"
                  ? "REPLY SENT"
                  : "QUESTION PLAYING"}
              </span>
            </HardwareButton>
          ) : radioOn ? (
            <>
              <HardwareButton
                tone="end"
                className="flex-1"
                // Pressed in while it finds you the next person, so pressing again does nothing
                // (the radio switch still turns it all off); it pops back up when they connect.
                sunk={hangingUp && state === "connecting"}
                onClick={hangingUp && state === "connecting" ? undefined : state === "connecting" ? () => setState("off") : endCall}
                aria-disabled={hangingUp && state === "connecting"}
                // Nobody to hang up on during a timeout; the radio switch still turns it off.
                disabled={state === "lost" || state === "timeout"}
                aria-label={state === "connecting" ? "Stop connecting" : "End call"}
                data-cuelume-tap="close"
                data-cuelume-emphasis="strong"
              >
                {/* Icon only: the red hang-up key needs no words. */}
                <PhoneDisconnect size={28} className="shrink-0 opacity-80" aria-hidden />
              </HardwareButton>
              <HardwareButton
                className={CALL_KEY}
                // Pressed in and lit = mic on, which is how every call starts. Muting pops it up;
                // on a break the mic stays off, and pressing it ends the break. While you record
                // a drop the call can't hear you, so the mic reads as off until you drop it.
                pressed={!micMuted && !onBreak && !dropRecording}
                onClick={() => (onBreak ? setOnBreak(false) : setMicMuted(!micMuted))}
                aria-label={micMuted || onBreak ? "Unmute microphone" : "Mute microphone"}
              >
                {micMuted || onBreak ? (
                  <MicrophoneSlash size={24} className="opacity-60" aria-hidden />
                ) : (
                  <Microphone size={24} className="opacity-60" aria-hidden />
                )}
              </HardwareButton>
            </>
          ) : messageOn && message.message ? (
            <MessageKeys controls={message} color={MESSAGE_COLOR[message.message.kind]} squareKey={CALL_KEY} />
          ) : (
            <>
              {/* Where Music used to be: Start journey, then End journey (straight to the recap; no pause).
                  It works the same in every flow. Flows 2 to 4 just never arrive by themselves, so the
                  drive keeps going until you press it; only Flow 5 ends at the destination. */}
              {started ? (
                <HardwareButton tone="end" className="flex-1" onClick={endJourney} data-cuelume-emphasis="strong">
                  <FlagCheckered size={24} className="opacity-80" aria-hidden />
                  <span className="text-base font-bold opacity-80">END JOURNEY</span>
                </HardwareButton>
              ) : (
                <HardwareButton className="flex-1" onClick={startJourney} data-cuelume-emphasis="strong">
                  <NavigationArrow size={24} className="opacity-80" aria-hidden />
                  <span className="text-base font-bold opacity-80">START JOURNEY</span>
                </HardwareButton>
              )}
            </>
          )}
          {/* Drop is for planting your own thing while you drive alone, so it's on the console the
              whole drive (not on a call: you're talking to someone). Always the same 70px square in
              the same place, whatever else the row is doing. While something else has the mic or the
              screen (a message, Flow 4's question listening or playing, Night mode), it's there but
              greyed out: one voice at a time. */}
          {!radioOn && (
          <HardwareButton
            className={CALL_KEY}
            // Pressed in and lit while recording; tap again to drop it here. Waits while the last one is sorting.
            pressed={dropRecording}
            disabled={drop.phase === "sorting" || messageOn || nightTalking || (questionDemo && questionStage !== "driving")}
            onClick={toggleDrop}
            aria-label={dropRecording ? "Drop it here" : "Leave a drop"}
          >
            {/* While recording the key says what the next tap does: send it, like Respond's send key. */}
            {dropRecording ? (
              <PaperPlaneRight size={24} className="opacity-80" aria-hidden />
            ) : (
              <MapPinPlus size={24} className="opacity-60" aria-hidden />
            )}
          </HardwareButton>
          )}
          {/* Settings stays on the console during a call too, square like Mic. */}
          <HardwareButton
            className={CALL_KEY}
            pressed={settingsOpen}
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-label={settingsOpen ? "Close settings" : "Settings"}
            aria-expanded={settingsOpen}
          >
            <GearSix size={24} className="opacity-60" aria-hidden />
          </HardwareButton>
        </div>
      </div>

      {/* Light on the casing, from above. It stays put: it doesn't follow the cursor or the phone's tilt. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-soft-light"
        style={{ background: "radial-gradient(circle at 50% 22%, rgb(255 255 255 / 0.22), transparent 60%)" }}
      />

      <Nightfall phase={nightDrive.phase} map={SCREEN} />

      {flights.map((f) => (
        <CollectFlight key={f.id} kind={f.kind} from={f.from} to={LCD_TALLY} onLanded={() => landed(f)} />
      ))}
    </div>
  );
}

function StoryDemoLcd({ stage }: { stage: StoryStage }) {
  const prompt = stage === "prompt" || stage === "reply-ready";
  return (
    <p role="status" className="px-3 text-center font-mono uppercase leading-tight text-lcd-ink">
      <span className="block text-[10px]">MESSAGE FROM @NIGHTOWL</span>
      <span className="mt-1 block text-[11px] normal-case">{prompt ? "Would you like to reply to this message?" : "Whoever’s hearing this…"}</span>
    </p>
  );
}

/** A check mark on the LCD's pixel grid (one ink, square pixels), for a reply that's gone out. */
const CHECK = ["........#", ".......##", "#.....##.", "##...##..", ".##.##...", "..###....", "...#....."];
function PixelCheck({ className }: { className?: string }) {
  return (
    <svg aria-hidden width={27} height={21} viewBox="0 0 9 7" shapeRendering="crispEdges" className={className}>
      {CHECK.flatMap((row, y) => [...row].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)))}
    </svg>
  );
}

/** Flow 4's LCD. The question stays hidden until you've said yes, then shows while it plays. */
function QuestionDemoLcd({ stage }: { stage: QuestionStage }) {
  if (stage === "sent") {
    return (
      <p role="status" className="flex flex-col items-center px-3 text-center font-mono uppercase leading-tight text-lcd-ink">
        <PixelCheck className="reply-sent-pop" />
        <span className="mt-1.5 block text-[14px]">Reply sent</span>
        <span className="mt-1 block text-[11px] normal-case">to @NightOwl</span>
      </p>
    );
  }
  if (stage === "answering") {
    return (
      <p role="status" className="px-3 text-center font-mono uppercase leading-tight text-lcd-ink">
        <span className="block text-[14px]">Your reply</span>
        <span className="mt-1 block text-[11px] normal-case">to @NightOwl</span>
      </p>
    );
  }
  if (stage === "playing") {
    return (
      <p role="status" className="px-3 text-center font-mono uppercase leading-tight text-lcd-ink">
        <span className="block text-[10px]">Question from @NightOwl</span>
        <span className="mt-1 block text-[14px] normal-case">{ROAD_QUESTION}</span>
      </p>
    );
  }
  return (
    <p role="status" className="px-3 text-center font-mono uppercase leading-tight text-lcd-ink">
      <span className="block text-[10px]">A question from @NightOwl</span>
      <span className="mt-1 block text-[12px] normal-case">
        {stage === "unlocking" ? "You just unlocked a question" : "Would you like to respond?"}
      </span>
      {stage === "reply-ready" && <span className="mt-1 block text-[10px]">Say yes</span>}
    </p>
  );
}

/** The dithered map from Figma, shown if the browser can't draw the live map (no WebGL). */
function PlaceholderMap({ travellers, drops }: { travellers: Traveller[]; drops: Drop[] }) {
  // Where you are on the placeholder: drops leave from here and slide back down the road.
  const you = travellers.find((t) => t.ahead === 0) ?? travellers[0];
  return (
    <>
      {/* Same green cast as the live map; the markers sit outside it and keep their colors. */}
      <div className="absolute inset-0 [filter:var(--map-lcd-tint)]">
      <Image
        src="/radio/map-dithered.png"
        alt=""
        width={393}
        height={852}
        priority
        unoptimized
        className="absolute max-w-none [filter:var(--map-filter)] [image-rendering:pixelated]"
        style={{ left: -SCREEN.left, top: -SCREEN.top }}
      />
      </div>
      {/* Only you: other drivers are never shown on the map. */}
      {you && (
        <MapMarker
          color={you.color}
          label="You"
          className="absolute"
          style={{ left: you.x - SCREEN.left, top: you.y - SCREEN.top, width: 19.8, height: 19.8 }}
        />
      )}
      {you &&
        drops.map((d) => (
          <LeftBehind key={d.id} kind={d.kind} from={{ x: you.x - SCREEN.left + 9.9, y: you.y - SCREEN.top + 9.9 }} />
        ))}
    </>
  );
}
