"use client";

import { Microphone, Music, PartlyCloudyNight, Settings } from "@carbon/icons-react";
import { FlagCheckered, PhoneDisconnect, SpeakerHigh } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { setMusicSpeaker, startMusic, stopMusic } from "@/lib/music";
import type { CharacterId } from "@/lib/profile/characters";
import { useArrived } from "@/lib/trip/useArrived";
import { cue } from "@/lib/sound";
import { NavMap } from "../nav/NavMap";
import { MapMarker, type MarkerColor } from "../ui/MapMarker";
import { cn } from "../ui/cn";
import { HardwareButton } from "./HardwareButton";
import { LcdScreen } from "./LcdScreen";
import { Led } from "./Led";
import { RadioLcd, type CallState } from "./RadioLcd";
import { RadioSettings } from "./RadioSettings";
import { RadioCallSettings, type ReportReason } from "./RadioCallSettings";
import { blockHandle, useRadioSettings } from "@/lib/radio-settings";
import { PowerButton } from "./PowerButton";
import { RockerSwitch } from "./RockerSwitch";
import { useTilt } from "./useTilt";

/** Mic, Speaker and Settings during a call: square keys, as tall as the row (70px). */
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
  /** The person you get connected to and their character (mocked). */
  peer?: string;
  peerCharacter?: CharacterId;
  /** Pin whether they're talking (Storybook). Otherwise it's mocked: they talk, pause, talk. */
  speaking?: boolean;
  /** Where the radio starts. Off shows Music, Speaker and Settings; on a call it's End call, Mic, Speaker and Settings. */
  defaultState?: CallState;
  /** Shorthand for starting connected. */
  defaultOn?: boolean;
  /** After "Currently connected to", when the other person's audio should start. */
  onConnected?: (peer: string) => void;
  travellers?: Traveller[];
  onEndCall?: () => void;
  /** After the power-off slide finishes: the app goes back to Start your journey. */
  onPower?: () => void;
  /** Arrive at the destination now (demos, Storybook). Otherwise you arrive once the drive's time is up. */
  arrived?: boolean;
  onEndTrip?: () => void;
  className?: string;
};

/** One continuous casing: the top bar, the frame around the map and the console are the same piece. */
const casing =
  "[background:var(--panel-noise),var(--casing-gradient)] shadow-[var(--panel-highlight)]";

/** The "Connected" radio screen (Figma node 123:246): the navigation map on an inset screen above the radio console. */
export function RadioScreen({
  time = "3:30 AM",
  outcome = "connected",
  connectMs = 3000,
  peer = "@sunny_side",
  peerCharacter = "mochi",
  speaking: speakingPinned,
  defaultOn = false,
  defaultState = defaultOn ? "connected" : "off",
  onConnected,
  travellers = DEFAULT_TRAVELLERS,
  onEndCall,
  onPower,
  arrived: forceArrived = false,
  onEndTrip,
  className,
}: RadioScreenProps) {
  const [state, setState] = useState<CallState>(defaultState);
  const radioOn = state !== "off";
  // "Currently connected to" shows for a moment when the call comes through.
  const [greeting, setGreeting] = useState(false);
  // Who you're talking to. The first call is `peer`; each End call finds someone new (mocked).
  const [calls, setCalls] = useState(0);
  // Anyone you've reported never comes up again.
  const { blocked } = useRadioSettings();
  const nextCallers = NEXT_CALLERS.filter((c) => !blocked.includes(c.handle));
  const caller =
    calls === 0 || !nextCallers.length
      ? { handle: peer, character: peerCharacter }
      : nextCallers[(calls - 1) % nextCallers.length];
  // Taking a break: your mic is off and they hear you're on a break (mocked).
  const [onBreak, setOnBreak] = useState(false);
  // End call hangs up and goes straight back to Connecting to find you a new person.
  const endCall = () => {
    setGreeting(false);
    setOnBreak(false);
    setSettingsOpen(false);
    setCalls((n) => n + 1);
    setState("connecting");
    onEndCall?.();
  };
  // Report: they're blocked from matching you again, then the radio hangs up and finds someone new.
  const report = (reason: ReportReason) => {
    blockHandle(caller.handle);
    void reason; // Sent with the report once there's a backend.
    endCall();
  };
  const [micMuted, setMicMuted] = useState(false);
  // Speakerphone, not mute: off just means the call isn't on speaker.
  const [speakerOn, setSpeakerOn] = useState(false);
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
  useTilt(root);
  // At the destination the button row becomes a single End trip.
  const arrived = useArrived(forceArrived);

  // Music only plays while the radio is off; turning the radio on or leaving the screen stops it.
  const playing = musicOn && !radioOn;
  useEffect(() => {
    if (!playing) return;
    startMusic();
    return stopMusic;
  }, [playing]);
  useEffect(() => {
    setMusicSpeaker(speakerOn);
  }, [speakerOn]);

  // Connecting: CONNECTING... on the LCD until the call comes through or drops.
  useEffect(() => {
    if (state !== "connecting") return;
    const t = setTimeout(() => {
      setState(outcome);
      if (outcome === "connected") {
        setGreeting(true);
        cue("ready", { emphasis: "subtle", theme: "mech" });
      } else {
        cue("error", { theme: "mech" });
      }
    }, connectMs);
    return () => clearTimeout(t);
  }, [state, outcome, connectMs]);

  // Then their audio starts.
  useEffect(() => {
    if (!greeting) return;
    const t = setTimeout(() => {
      setGreeting(false);
      onConnected?.(caller.handle);
    }, 2500);
    return () => clearTimeout(t);
  }, [greeting, caller.handle, onConnected]);

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
        "relative h-[852px] w-[393px] overflow-hidden font-sans text-foreground",
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
        className="absolute overflow-hidden bg-[#111] shadow-[0_1px_0_rgb(255_255_255/0.12)]"
        style={SCREEN}
      >
        <NavMap
          travellers={travellers}
          className="absolute inset-0"
          fallback={<PlaceholderMap travellers={travellers} />}
        />
        {/* Glass: inner shadow so the map reads as a screen set into the case */}
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_3px_8px_rgb(0_0_0/0.75),inset_0_0_0_1px_rgb(0_0_0/0.8)]" />
        <Glare />
      </section>

      {/* Top bar */}
      <header className="absolute inset-x-0 top-[10px] flex h-[52px] items-center justify-between pl-[17px] pr-[3px]">
        <div className="flex items-center gap-1.5">
          <PartlyCloudyNight size={20} aria-label="Partly cloudy" />
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
          <Led on={state !== "off" && state !== "thanks"} tone={state === "lost" ? "error" : "live"} blink={state === "connecting"} />
        </div>

        <RockerSwitch className="absolute left-[26px] top-[44px]" on={radioOn}
          onChange={(on) => {
            // After you've arrived, switching on doesn't connect anyone; the LCD just thanks you.
            setState(on ? (arrived ? "thanks" : "connecting") : "off");
            setGreeting(false);
            if (on) setMusicOn(false);
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
          <RadioLcd state={state} peerCharacter={caller.character} peer={caller.handle} greeting={greeting} speaking={speaking && !onBreak} away={onBreak} />
        </LcdScreen>
        <div className="pointer-events-none absolute left-[156px] top-[18px] h-[130px] w-[221px] overflow-hidden">
          <Glare />
        </div>

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
        <div className={cn("absolute left-[26px] top-[166px] flex w-[351px] gap-2", arrived && "hidden")}>
          {radioOn ? (
            <>
              <HardwareButton
                tone="end"
                className="flex-1"
                onClick={state === "connecting" ? () => setState("off") : endCall}
                disabled={state === "lost"}
                aria-label={state === "connecting" ? "Stop connecting" : "End call"}
                data-cuelume-tap="close"
                data-cuelume-emphasis="strong"
              >
                {/* Icon only: the red hang-up key needs no words. */}
                <PhoneDisconnect size={28} className="shrink-0 opacity-80" aria-hidden />
              </HardwareButton>
              <HardwareButton
                className={CALL_KEY}
                // On a break the mic stays off; pressing it ends the break.
                pressed={micMuted || onBreak}
                onClick={() => (onBreak ? setOnBreak(false) : setMicMuted(!micMuted))}
                aria-label={micMuted || onBreak ? "Unmute microphone" : "Mute microphone"}
              >
                <Microphone size={24} className="opacity-60" aria-hidden />
              </HardwareButton>
            </>
          ) : (
            <>
              <HardwareButton
                className="flex-1"
                pressed={musicOn}
                onClick={() => setMusicOn(!musicOn)}
                aria-label={musicOn ? "Stop music" : "Play music"}
              >
                <Music size={24} className="opacity-60" aria-hidden />
              </HardwareButton>
            </>
          )}
          <HardwareButton
            className={radioOn ? CALL_KEY : "flex-1"}
            // Speakerphone: starts up (on the phone, held to your ear); pressed in and lit = on speaker.
            pressed={speakerOn}
            onClick={() => setSpeakerOn(!speakerOn)}
            aria-label={speakerOn ? "Turn speaker off" : "Turn speaker on"}
          >
            <SpeakerHigh size={25} className="opacity-60" aria-hidden />
          </HardwareButton>
          {/* Settings stays on the console during a call too, square like Mic and Speaker. */}
          <HardwareButton
            className={radioOn ? CALL_KEY : "flex-1"}
            pressed={settingsOpen}
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-label={settingsOpen ? "Close settings" : "Settings"}
            aria-expanded={settingsOpen}
          >
            <Settings size={24} className="opacity-60" aria-hidden />
          </HardwareButton>
        </div>
      </div>

      {/* Light on the casing, sliding the way the phone tilts */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-soft-light"
        style={{
          background:
            "radial-gradient(circle at calc(50% + var(--tilt-x, 0) * 45%) calc(22% + var(--tilt-y, 0) * 35%), rgb(255 255 255 / 0.22), transparent 60%)",
        }}
      />
    </div>
  );
}

/**
 * A streak of light across glass. It sits off the edge while the phone is held still and
 * sweeps across once you tilt far enough (right or toward you from one side, left or away
 * from the other), like a real reflection catching the screen. Blends with what's under it,
 * so it reads on dark and light themes alike.
 */
function Glare() {
  const band = (sign: 1 | -1) => ({
    // p rises from 0 at rest to about ±1 at full tilt; the band crosses the glass around p = ±0.5.
    left: `calc((var(--tilt-x, 0) + var(--tilt-y, 0) * 0.5) * 200% ${sign > 0 ? "- 80%" : "+ 120%"})`,
  });
  const streak =
    "linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 0.05) 35%, rgb(255 255 255 / 0.28) 50%, rgb(255 255 255 / 0.05) 65%, transparent 100%)";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden mix-blend-screen">
      <div className="absolute -inset-y-4 w-[60%] -skew-x-12" style={{ ...band(1), background: streak }} />
      <div className="absolute -inset-y-4 w-[60%] -skew-x-12" style={{ ...band(-1), background: streak }} />
    </div>
  );
}

/** The dithered map from Figma, shown when Google Maps isn't set up. */
function PlaceholderMap({ travellers }: { travellers: Traveller[] }) {
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
      {travellers.map((t) => (
        <MapMarker
          key={t.id}
          color={t.color}
          label={t.label}
          className="absolute"
          style={{ left: t.x - SCREEN.left, top: t.y - SCREEN.top, width: 19.8, height: 19.8 }}
        />
      ))}
    </>
  );
}
