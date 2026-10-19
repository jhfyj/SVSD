"use client";

import { useEffect, useRef, useState } from "react";
import { cue } from "@/lib/sound";
import {
  AFTER_LINE_MS,
  DAY_MS,
  DUSK_MS,
  LISTEN_MS,
  NIGHT_HOLD_MS,
  NIGHT_ON_MS,
  NIGHT_VOICE,
  NOTHING_MS,
  RELIGHT_MS,
  REST_ARRIVE_MS,
  STOPPED_LINE,
  type NightPhase,
  type NightStart,
} from "@/lib/radio/nightDrive";
import { START_TIMEOUT_MS } from "@/lib/radio/scriptVoice";
import { announce, playVoice, type Level } from "@/lib/radio/voice";

export type NightDriveControls = {
  phase: NightPhase;
  /** Your voice while you answer the check-in (a stand-in, see sleepyAnswer). */
  level: React.RefObject<Level | null>;
  /** Talking to you or waiting on you: stories on the road hold off (they queue and play after), and Drop and Music wait. */
  busy: boolean;
  /** Rerouted to the rest area, or parked there: the usual keys step aside. Stories keep coming. */
  resting: boolean;
  /** Parked at the rest area: the drive holds still on the map. */
  parked: boolean;
  /** Leaving the rest area: the drive picks up again, and the radio doesn't check in again straight away. */
  backOnTheRoad: () => void;
  /** You went live (Company on) mid check-in: the radio stops asking and leaves you to your call. */
  interrupt: () => void;
};

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Night mode's script, from sunset to the rest area. Each phase moves on by itself: the driver
 * never has to look or tap. `onNightfall` switches the app to the night theme; it's called under
 * the relight flicker, so the swap from the day radio to the amber one is never seen.
 * Reduced motion: no sunset and no flicker, the radio goes straight to NIGHT MODE ON.
 */
export function useNightDrive({ start, onNightfall }: { start?: NightStart; onNightfall?: () => void }): NightDriveControls {
  const [phase, setPhase] = useState<NightPhase>(() =>
    start === "fall" ? "day" : start === "checkin" ? "checkin" : start === "rest" ? "rerouting" : "off",
  );
  const level = useRef<Level | null>(null);
  // After a rest (or a check-in you cut short), the quiet night radio doesn't check in again on its own.
  const calm = useRef(false);
  const nightfall = useRef(onNightfall);
  useEffect(() => {
    nightfall.current = onNightfall;
  }, [onNightfall]);

  // A recorded line is playing: stories on the road hold off until it's done, then carry on.
  const [speaking, setSpeaking] = useState(false);
  // "214 driving tonight" is said once, the first time night settles in, not after every rest.
  const toldTonight = useRef(start === "rest");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const lines: { stop: () => void }[] = [];
    let live = true;
    const after = (ms: number, next: NightPhase) => (t = setTimeout(() => setPhase(next), ms));
    // Play one of Night mode's recordings; then (and at least `min` ms after it began) go on to `next`.
    const say = (src: string, next?: NightPhase, min = 0) => {
      const began = Date.now();
      const v = speak(src);
      lines.push(v);
      setSpeaking(true);
      void v.done.then(() => {
        if (!live) return;
        setSpeaking(false);
        if (next) after(Math.max(AFTER_LINE_MS, min - (Date.now() - began)), next);
      });
    };

    if (phase === "day") after(DAY_MS, "dusk");
    if (phase === "dusk") {
      // Reduced motion: no sunset, no flicker. The theme changes and NIGHT MODE ON shows at once.
      if (reducedMotion()) {
        nightfall.current?.();
        after(0, "nightOn");
      } else after(DUSK_MS, "relight");
    }
    if (phase === "relight") {
      // The veil is black on its first frame, so the theme can change under it.
      nightfall.current?.();
      cue("toggle", { theme: "mech", emphasis: "strong" });
      after(RELIGHT_MS, "nightOn");
    }
    if (phase === "nightOn") say(NIGHT_VOICE.on, "night", NIGHT_ON_MS);
    if (phase === "night") {
      const next: NightPhase | undefined = calm.current ? undefined : "checkin";
      if (!toldTonight.current) {
        toldTonight.current = true;
        say(NIGHT_VOICE.tonight, next, NIGHT_HOLD_MS);
      } else if (next) after(NIGHT_HOLD_MS, next);
    }
    if (phase === "checkin") {
      // Asked out loud, like a person would: a soft blip to get your attention, then the question.
      cue("ready", { theme: "mech", emphasis: "subtle" });
      say(NIGHT_VOICE.checkIn, "listening");
    }
    // No answer comes: it listens a while, says NOTHING HEARD, then reroutes you by itself.
    if (phase === "listening") {
      level.current = null;
      after(LISTEN_MS, "nothing");
    }
    if (phase === "nothing") say(NIGHT_VOICE.nothing, "rerouting", NOTHING_MS);
    if (phase === "rerouting") {
      level.current = null;
      cue("attention", { theme: "mech" });
      say(NIGHT_VOICE.rerouting);
      // Driving the 9 miles there (mocked), then parked.
      after(REST_ARRIVE_MS, "stopped");
    }
    if (phase === "stopped") {
      cue("ready", { theme: "mech", emphasis: "subtle" });
      // No recording for this one yet: silent, but it still holds stories off for as long as it would take.
      const line = announce(STOPPED_LINE);
      lines.push(line);
      setSpeaking(true);
      void line.done.then(() => live && setSpeaking(false));
    }
    return () => {
      live = false;
      clearTimeout(t);
      lines.forEach((l) => l.stop());
      setSpeaking(false);
    };
  }, [phase]);
  return {
    phase,
    level,
    busy: phase === "checkin" || phase === "listening" || phase === "nothing" || speaking,
    resting: phase === "rerouting" || phase === "stopped",
    parked: phase === "stopped",
    backOnTheRoad: () => {
      calm.current = true;
      setPhase("night");
    },
    interrupt: () => {
      if (phase !== "checkin" && phase !== "listening") return;
      calm.current = true;
      level.current = null;
      setPhase("night");
    },
  };
}

/**
 * Play a Night mode recording out loud. `done` resolves when it ends, or straight away if it can't
 * play or hasn't started within START_TIMEOUT_MS (blocked, or a background tab), so the night
 * never hangs on a line.
 */
function speak(src: string): { done: Promise<void>; stop: () => void } {
  const v = playVoice(src, true);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const done = Promise.race([
    v.done.catch(() => {}),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, START_TIMEOUT_MS);
      void v.started.then(() => clearTimeout(timer));
    }),
  ]).finally(() => clearTimeout(timer));
  return { done, stop: () => v.stop() };
}
