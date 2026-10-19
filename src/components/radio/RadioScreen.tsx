"use client";

import { FlagCheckered, GearSix, MapPinPlus, Microphone, MicrophoneSlash, MusicNotes, NavigationArrow, PaperPlaneRight, PhoneDisconnect } from "@phosphor-icons/react";
import { WeatherIcon } from "../journey/WeatherIcon";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { startMusic, stopMusic } from "@/lib/music";
import { DROP_LABEL, type Drop } from "@/lib/radio/drops";
import { DropLcd, LeftBehind } from "./Drop";
import { useDrop } from "./useDrop";
import type { CharacterId } from "@/lib/profile/characters";
import { useArrived } from "@/lib/trip/useArrived";
import { cue } from "@/lib/sound";
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
import { announce } from "@/lib/radio/voice";
import { IntentKeys } from "./IntentKeys";
import { formatCountdown, HANG_UP_RULE, recordHangUp, timedOutUntil, type HangUpRule } from "@/lib/radio/hangups";
import { MESSAGE_COLOR, SAMPLE_MESSAGES, type RouteMessage } from "@/lib/radio/messages";
import { PowerButton } from "./PowerButton";
import { MessageGlow, MessageKeys, MessageLcd } from "./RouteMessage";
import { useRouteMessage } from "./useRouteMessage";
import { RockerSwitch } from "./RockerSwitch";
import { Nightfall, NightLcd, RestSign } from "./NightDrive";
import { useNightDrive } from "./useNightDrive";
import type { NightStart } from "@/lib/radio/nightDrive";

/** Mic and Settings during a call (and Drop/Settings beside a message): square keys, as tall as the row (70px). */
const CALL_KEY = "w-[70px] shrink-0";

/** Mocked strangers for the calls after the first, until there's a backend matching people. */
const NEXT_CALLERS: { handle: string; character: CharacterId }[] = [
  { handle: "@Nightowl88", character: "boo" },
  { handle: "@Hufflepuff23", character: "pip" },
  { handle: "@Roadrunner5", character: "tako" },
  { handle: "@Mile84", character: "sprout" },
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
  time?: string;
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
  /** Where the radio starts. Off shows Music, Drop and Settings; on a call it's End call, Mic and Settings (no Drop). */
  defaultState?: CallState;
  /** Shorthand for starting connected. */
  defaultOn?: boolean;
  /** After the radio introduces you both, when the other person's audio should start. */
  onConnected?: (peer: string) => void;
  travellers?: Traveller[];
  onEndCall?: () => void;
  /** After the power-off slide finishes: the app goes back to Start your journey. */
  onPower?: () => void;
  /**
   * true: at the destination now (the Finished journey stories). false: never arrive, so the
   * call buttons always show (every other story). Unset: you arrive once the drive's time is up.
   */
  arrived?: boolean;
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
  /** Your own character, for the LCD when Night mode tells you to rest. */
  meCharacter?: CharacterId;
  className?: string;
};

/** Night mode phases that put something on the LCD (the sunset itself keeps the usual LCD). */
const NIGHT_LCD = ["nightOn", "night", "checkin", "listening", "rest"];

/** A beat of quiet between one message ending and the next one tuning in. */
const MESSAGE_GAP_MS = 2500;

/** Where collected pickups land: the counter's icon in the LCD's top-left corner, in the radio's own px. */
const LCD_TALLY = { x: 156 + 38, y: 585 + 18 + 18 };

type Flight = { id: string; kind: DropKind; from: { x: number; y: number } };

/** One continuous casing: the top bar, the frame around the map and the console are the same piece. */
const casing =
  "[background:var(--panel-noise),var(--casing-gradient)] shadow-[var(--panel-highlight)]";

/** The "Connected" radio screen (Figma node 123:246): the navigation map on an inset screen above the radio console. */
export function RadioScreen({
  time = "3:30 AM",
  outcome = "connected",
  connectMs = 3000,
  me = "@you",
  sharedMiles = 84,
  peer = "@sunny_side",
  peerCharacter = "mochi",
  speaking: speakingPinned,
  defaultOn = false,
  defaultState = defaultOn ? "connected" : "off",
  onConnected,
  travellers = DEFAULT_TRAVELLERS,
  onEndCall,
  onPower,
  arrived: forceArrived,
  onEndTrip,
  hangUpRule = HANG_UP_RULE,
  messages = SAMPLE_MESSAGES,
  defaultMessage,
  messageEveryMs = 30_000,
  demo,
  night,
  onNightfall,
  meCharacter = "freddie",
  className,
}: RadioScreenProps) {
  const [state, setState] = useState<CallState>(defaultState);
  const radioOn = state !== "off";
  // When the call comes through, the radio introduces you both (two lines, one LCD page each).
  const [greeting, setGreeting] = useState(false);
  const [introPage, setIntroPage] = useState<0 | 1>(0);
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
  const drop = useDrop();
  const dropRecording = drop.phase === "recording";
  const [musicOn, setMusicOn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Power off: the whole radio slides down out of view, then you're back at Start your journey.
  const [leaving, setLeaving] = useState(false);
  const leave = () => onPower?.();
  const powerOff = () => {
    if (leaving) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return leave();
    setLeaving(true);
  };
  const root = useRef<HTMLDivElement>(null);

  // Pickups collected on the map fly into the LCD, which keeps count.
  const [flights, setFlights] = useState<Flight[]>([]);
  const [collected, setCollected] = useState<Partial<Record<DropKind, number>>>({});
  const [tallyFlash, setTallyFlash] = useState(0);
  const onCollect = (pickup: Pickup, at: { x: number; y: number }) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return;
    // The radio can be drawn scaled (a narrow window), so map the page's px back to its own.
    const k = box.width / 393;
    setFlights((f) => [...f, { id: pickup.id, kind: pickup.kind, from: { x: (at.x - box.left) / k, y: (at.y - box.top) / k } }]);
  };
  const landed = (flight: Flight) => {
    setFlights((f) => f.filter((x) => x.id !== flight.id));
    setCollected((c) => ({ ...c, [flight.kind]: (c[flight.kind] ?? 0) + 1 }));
    setTallyFlash((n) => n + 1);
  };
  // At the destination the button row becomes a single End trip.
  const arrived = useArrived(forceArrived);
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
  const listening = state === "off" && !arrived && !leaving && !nightDrive.busy;
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

  // Music only plays while the radio is off and quiet; a message, the radio, or leaving the screen stops it.
  const playing = musicOn && !radioOn && !messageOn && !nightTalking;
  useEffect(() => {
    if (!playing) return;
    startMusic();
    return stopMusic;
  }, [playing]);

  // Arriving mid-drop drops it right there (the key row turns into End trip).
  const { toggle: toggleDrop } = drop;
  useEffect(() => {
    if (arrived && dropRecording) toggleDrop();
  }, [arrived, dropRecording, toggleDrop]);
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
    if (state !== "pick" || !intentSet) return;
    const t = setTimeout(() => setState("connecting"), 3000);
    return () => clearTimeout(t);
  }, [state, intentSet]);

  // The radio introduces you both out loud, a page on the LCD per line, then their audio starts.
  useEffect(() => {
    if (!greeting) return;
    let live = true;
    let line: ReturnType<typeof announce> | null = null;
    void (async () => {
      const lines = introLines(me, caller.handle, sharedMiles);
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) setIntroPage(1);
        line = announce(lines[i]);
        await line.done;
        if (!live) return;
      }
      setGreeting(false);
      onConnected?.(caller.handle);
    })();
    return () => {
      live = false;
      line?.stop();
    };
  }, [greeting, caller.handle, onConnected, me, sharedMiles]);

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
  const speaking = inCall && (speakingPinned ?? talking);

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
          travellers={travellers}
          messages={ahead}
          onReach={reach}
          drops={dropPins}
          demo={demo}
          onCollect={onCollect}
          className="absolute inset-0"
          fallback={<PlaceholderMap travellers={travellers} drops={drop.drops} />}
        />
        {/* A message playing: their voice comes down from the top; your reply (or a drop) rises from the bottom in your colour. */}
        {/* Night mode's rest area takes over the map: the road can wait. Once the route's set it
            folds to a strip, so you can see the way there. */}
        {nightDrive.resting && <RestSign folded={nightDrive.routed} />}
        {dropRecording ? (
          <MessageGlow mode="reply" color={youColor} level={drop.level} />
        ) : nightDrive.phase === "listening" && !radioOn ? (
          // Answering the check-in: your voice rises from the bottom, like a reply.
          <MessageGlow mode="reply" color={youColor} level={nightDrive.level} />
        ) : (
          <MessageGlow
            mode={!messageOn ? "off" : message.phase === "recording" ? "reply" : message.phase === "sent" || message.phase === "noMic" ? "off" : "voice"}
            color={message.phase === "recording" ? youColor : MESSAGE_COLOR[message.message?.kind ?? "message"]}
            level={message.level}
          />
        )}
        {/* Glass: inner shadow so the map reads as a screen set into the case */}
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_3px_8px_rgb(0_0_0/0.75),inset_0_0_0_1px_rgb(0_0_0/0.8)]" />
      </section>

      {/* Top bar */}
      <header className="absolute inset-x-0 top-[10px] flex h-[52px] items-center justify-between pl-[17px] pr-[3px]">
        <div className="flex items-center gap-1.5">
          <WeatherIcon />
          <span className="font-display text-[20px] leading-none">{time}</span>
        </div>
        <PowerButton onClick={powerOff} />
      </header>

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
              setMusicOn(false);
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
          {drop.active && state !== "pick" ? <DropLcd controls={drop} /> : !radioOn && NIGHT_LCD.includes(nightDrive.phase) ? <NightLcd phase={nightDrive.phase} level={nightDrive.level} character={meCharacter} routed={nightDrive.routed} /> : messageOn ? <MessageLcd controls={message} /> : <RadioLcd state={state} peerCharacter={caller.character} peer={caller.handle} greeting={greeting} intro={{ me, miles: sharedMiles, page: introPage }} hint={state === "pick" ? (intentSet ? intentInfo.key : undefined) : state === "connecting" ? intentInfo.looking : undefined} speaking={speaking && !onBreak} away={onBreak} countdown={timeoutUntil && now ? formatCountdown(timeoutUntil - now) : undefined} />}
          <CollectedTally counts={collected} flash={tallyFlash} />
        </LcdScreen>

        {arrived && (
          <div className="absolute left-[26px] top-[166px] flex w-[351px]">
            <HardwareButton
              className="flex-1"
              onClick={onEndTrip}
              data-cuelume-emphasis="strong"
            >
              <FlagCheckered size={24} className="opacity-80" aria-hidden />
              <span className="text-base font-bold opacity-80">END TRIP</span>
            </HardwareButton>
          </div>
        )}
        {/* At the rest area the key row is one wide key: route there. Lit once it's set. */}
        {nightDrive.resting && !radioOn && !arrived && (
          <div className="absolute left-[26px] top-[166px] flex w-[351px]">
            <HardwareButton
              className="flex-1"
              pressed={nightDrive.routed}
              onClick={nightDrive.routed ? undefined : nightDrive.route}
              aria-label={nightDrive.routed ? "Route to the rest area set" : "Route to the rest area"}
            >
              <NavigationArrow size={24} className={nightDrive.routed ? undefined : "opacity-80"} aria-hidden />
              <span className="text-[13px] font-bold opacity-80">{nightDrive.routed ? "ROUTE SET" : "ROUTE TO REST AREA"}</span>
            </HardwareButton>
          </div>
        )}
        {/* What you're up for: the console keys become the four intents, a 2 x 2 grid of wide keys.
            A remembered pick sits pressed in and lit, and is kept after 3 seconds. */}
        {state === "pick" && !arrived && (
          <div className="absolute left-[26px] top-[166px] flex w-[351px]">
            <IntentKeys current={intentSet ? intent : undefined} onPick={pickIntent} />
          </div>
        )}
        <div className={cn("absolute left-[26px] top-[166px] flex w-[351px] gap-2", (arrived || state === "pick" || (nightDrive.resting && !radioOn)) && "hidden")}>
          {radioOn ? (
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
              <HardwareButton
                className="flex-1"
                pressed={musicOn}
                onClick={() => setMusicOn(!musicOn)}
                aria-label={musicOn ? "Stop music" : "Play music"}
              >
                <MusicNotes size={24} className="opacity-60" aria-hidden />
              </HardwareButton>
            </>
          )}
          {/* Drop is for planting your own thing while you drive alone: not on a call (you're
              talking to someone) and not while a message plays (that has its own Respond). */}
          {!radioOn && (
          <HardwareButton
            className={messageOn ? CALL_KEY : "flex-1"}
            // Pressed in and lit while recording; tap again to drop it here. Waits while the last one is sorting.
            pressed={dropRecording}
            // Waits while Night mode is listening to you, too: one voice at a time.
            disabled={drop.phase === "sorting" || messageOn || nightTalking}
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
            className={radioOn || messageOn ? CALL_KEY : "flex-1"}
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
