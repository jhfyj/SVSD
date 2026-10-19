"use client";

import { useEffect, useRef, useState } from "react";
import { cue } from "@/lib/sound";
import {
  ANSWER_BEAT_MS,
  ANSWER_MS,
  CHECK_IN,
  DAY_MS,
  DUSK_MS,
  NIGHT_HOLD_MS,
  NIGHT_ON_MS,
  RELIGHT_MS,
  REST_LINE,
  sleepyAnswer,
  type NightPhase,
  type NightStart,
} from "@/lib/radio/nightDrive";
import { announce, type Level } from "@/lib/radio/voice";

export type NightDriveControls = {
  phase: NightPhase;
  /** Your voice while you answer the check-in (a stand-in, see sleepyAnswer). */
  level: React.RefObject<Level | null>;
  /** Talking to you or waiting on you: stories on the road hold off, and Drop and Music wait. */
  busy: boolean;
  /** At the rest area: stories are paused until you're back on the road. */
  resting: boolean;
  /** You asked for the route to the rest area. */
  routed: boolean;
  route: () => void;
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
    start === "fall" ? "day" : start === "checkin" ? "checkin" : start === "rest" ? "rest" : "off",
  );
  const [routed, setRouted] = useState(false);
  const level = useRef<Level | null>(null);
  const nightfall = useRef(onNightfall);
  useEffect(() => {
    nightfall.current = onNightfall;
  }, [onNightfall]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    let line: ReturnType<typeof announce> | null = null;
    let live = true;
    const after = (ms: number, next: NightPhase) => (t = setTimeout(() => setPhase(next), ms));

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
    if (phase === "nightOn") after(NIGHT_ON_MS, "night");
    if (phase === "night") after(NIGHT_HOLD_MS, "checkin");
    if (phase === "checkin") {
      // Asked out loud, like a person would: a soft blip to get your attention, then the question.
      cue("ready", { theme: "mech", emphasis: "subtle" });
      line = announce(`${CHECK_IN.title} ${CHECK_IN.ask}`);
      void line.done.then(() => live && setPhase("listening"));
    }
    if (phase === "listening") {
      level.current = sleepyAnswer();
      after(ANSWER_MS + ANSWER_BEAT_MS, "rest");
    }
    if (phase === "rest") {
      level.current = null;
      cue("attention", { theme: "mech" });
      line = announce(REST_LINE);
    }
    return () => {
      live = false;
      clearTimeout(t);
      line?.stop();
    };
  }, [phase]);

  return {
    phase,
    level,
    busy: phase === "checkin" || phase === "listening" || phase === "rest",
    resting: phase === "rest",
    routed,
    route: () => {
      setRouted(true);
      cue("success", { theme: "mech", emphasis: "subtle" });
    },
  };
}
