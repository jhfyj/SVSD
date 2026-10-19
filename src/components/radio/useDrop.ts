"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { DROP_MIN_MS, DROP_SHOW_MS, DROP_SORT_MS, sampleTranscript, saveDrop, sortDrop, transcribe, type Drop } from "@/lib/radio/drops";
import { quietClock } from "@/lib/radio/quiet";
import { playVoice, recordReply, type Level, type Recording, type Voice } from "@/lib/radio/voice";
import { cue } from "@/lib/sound";

/**
 * Where a drop is up to: recording (your voice, the key latched), sorting (a moment on the LCD),
 * dropped (what it became), noMic (the mic is blocked), empty (you never said anything), or idle.
 */
export type DropPhase = "idle" | "recording" | "sorting" | "dropped" | "noMic" | "empty";

/** How long "Mic is off" stays on the LCD. */
const NOTICE_MS = 1800;

export type DropControls = {
  phase: DropPhase;
  /** The last one you dropped (what "dropped" shows). */
  last: Drop | null;
  /** Everything dropped on this trip, oldest first. */
  drops: Drop[];
  /** While recording: how long you've been recording, in ms, counting up; null until the mic is live. */
  elapsed: number | null;
  /** While recording, once you've gone quiet: ms until it sends itself; null while you're talking. */
  sendsIn: number | null;
  /** Your voice while recording, for the glow. */
  level: RefObject<Level | null>;
  /** Busy with the LCD: recording, sorting or showing what it became. */
  active: boolean;
  /** The Drop key: start recording, or drop what you've recorded. */
  toggle: () => void;
};

/**
 * A scripted drop for the demo: instead of the mic, Drop plays this recording as if you were saying
 * it (same screen, same glow from your voice), then sorts `text` and leaves it on the road when the
 * recording ends. No permission prompt. Pass a stable object (a module constant).
 */
export type DropScript = { src: string; text: string };

/** One console key leaves something on the road: tap to record, tap again to drop it here. */
export function useDrop(script?: DropScript): DropControls {
  const [phase, setPhase] = useState<DropPhase>("idle");
  const [drops, setDrops] = useState<Drop[]>([]);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [sendsIn, setSendsIn] = useState<number | null>(null);
  const level = useRef<Level | null>(null);
  const recording = useRef<Recording | null>(null);
  const words = useRef<ReturnType<typeof transcribe> | null>(null);
  const started = useRef(0);
  const voice = useRef<Voice | null>(null);

  // Drop it: stop the mic, sort what you said, and leave it on the road.
  const finish = useCallback(async () => {
    if (script) {
      // Tapped again before the recording got going: never mind.
      if (!voice.current) return setPhase("idle");
      voice.current.stop();
      voice.current = null;
      level.current = null;
      setPhase("sorting");
      await new Promise((r) => setTimeout(r, DROP_SORT_MS));
      const drop: Drop = { id: `drop-${Date.now()}`, kind: sortDrop(script.text), text: script.text, src: script.src, droppedAt: Date.now() };
      saveDrop(drop);
      setDrops((d) => [...d, drop]);
      cue("success", { theme: "mech" });
      setPhase("dropped");
      return;
    }
    const rec = recording.current;
    // Tapped again before the mic came up (e.g. at the browser's prompt): never mind.
    if (!rec) return setPhase("idle");
    recording.current = null;
    level.current = null;
    const heard = words.current;
    words.current = null;
    const ms = Date.now() - started.current;
    if (ms < DROP_MIN_MS) {
      // A slip of the finger: nothing to drop.
      rec.cancel();
      void heard?.stop();
      cue("error", { theme: "mech" });
      setPhase("idle");
      return;
    }
    setPhase("sorting");
    const [blob, text] = await Promise.all([
      rec.stop(),
      heard?.stop() ?? Promise.resolve(""),
      new Promise((r) => setTimeout(r, DROP_SORT_MS)),
    ]);
    const said = text || sampleTranscript();
    const drop: Drop = {
      id: `drop-${Date.now()}`,
      kind: sortDrop(said),
      text: said,
      src: blob ? URL.createObjectURL(blob) : null,
      droppedAt: Date.now(),
    };
    saveDrop(drop);
    setDrops((d) => [...d, drop]);
    cue("success", { theme: "mech" });
    setPhase("dropped");
  }, [script]);

  const toggle = useCallback(() => {
    if (phase === "recording") return void finish();
    if (phase === "idle" || phase === "dropped" || phase === "noMic" || phase === "empty") setPhase("recording");
  }, [phase, finish]);

  // Nothing said at all: throw it away rather than drop ten seconds of road noise.
  const discard = useCallback(() => {
    recording.current?.cancel();
    recording.current = null;
    level.current = null;
    void words.current?.stop();
    words.current = null;
    cue("error", { theme: "mech" });
    setPhase("empty");
  }, []);

  // Recording: the mic goes live (a beep says so) and the time counts up, no limit. Go quiet for
  // QUIET_MS and it sends itself, the way a voice note does; tapping send does it sooner.
  useEffect(() => {
    if (phase !== "recording") return;
    let live = true;
    let tick: ReturnType<typeof setInterval> | undefined;
    if (script) {
      // The scripted drop: the recording plays as your voice, and drops itself when it ends.
      cue("ready", { theme: "mech" });
      const v = playVoice(script.src, true);
      voice.current = v;
      level.current = v.level;
      // The time counts up from when your voice starts, like the mic going live.
      void v.started.then(() => {
        if (!live) return;
        started.current = Date.now();
        setElapsed(0);
        tick = setInterval(() => setElapsed(Date.now() - started.current), 100);
      });
      const done = () => live && void finish();
      v.done.then(done, done);
      return () => {
        live = false;
        clearInterval(tick);
        setElapsed(null);
      };
    }
    recordReply().then(
      (rec) => {
        if (!live) return rec.cancel();
        recording.current = rec;
        level.current = rec.level;
        words.current = transcribe();
        cue("ready", { theme: "mech" });
        started.current = Date.now();
        const quiet = quietClock(started.current);
        setElapsed(0);
        tick = setInterval(() => {
          const now = Date.now();
          const { spoke, sendsIn, done } = quiet(rec.level(), now);
          setElapsed(now - started.current);
          setSendsIn(sendsIn);
          if (done) {
            clearInterval(tick);
            if (spoke) void finish();
            else discard();
          }
        }, 100);
      },
      () => {
        if (!live) return;
        cue("error", { theme: "mech" });
        setPhase("noMic");
      },
    );
    return () => {
      live = false;
      clearInterval(tick);
      setElapsed(null);
      setSendsIn(null);
    };
  }, [phase, finish, discard, script]);

  // Leaving the radio mid-recording throws it away.
  useEffect(
    () => () => {
      recording.current?.cancel();
      void words.current?.stop();
      voice.current?.stop();
    },
    [],
  );

  // What it became (or "Mic is off") shows for a moment, then the LCD goes back to the radio.
  useEffect(() => {
    if (phase !== "dropped" && phase !== "noMic" && phase !== "empty") return;
    const t = setTimeout(() => setPhase("idle"), phase === "dropped" ? DROP_SHOW_MS : NOTICE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  return {
    phase,
    last: drops[drops.length - 1] ?? null,
    drops,
    elapsed,
    sendsIn,
    level,
    active: phase !== "idle",
    toggle,
  };
}
