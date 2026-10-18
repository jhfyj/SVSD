"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { REPLY_MAX_MS, RESPOND_WINDOW_MS, type RouteMessage } from "@/lib/radio/messages";
import { playVoice, recordReply, tuneIn, type Level, type Recording, type Voice } from "@/lib/radio/voice";
import { cue } from "@/lib/sound";

/**
 * Where a message on the road is up to:
 * tuning (static, then the station locks), playing (their voice), recording (your reply),
 * sent (a moment to say it went), noMic (you chose to respond but the mic is blocked), or idle.
 */
export type MessagePhase = "idle" | "tuning" | "playing" | "recording" | "sent" | "noMic";

/** The 5 seconds to choose to respond: not started (still tuning in), open, or gone. */
export type RespondWindow = "waiting" | "open" | "closed";

/** How long "Sent" or "Mic is off" stays on the LCD. */
const NOTICE_MS = 1800;

/** Static crackle while tuning in, so the glow flickers before the voice arrives. */
const staticLevel: Level = () => 0.2 + Math.random() * 0.3;

export type RouteMessageControls = {
  message: RouteMessage | null;
  phase: MessagePhase;
  /** You've chosen to respond: the radio records your reply when they finish. */
  respond: boolean;
  respondWindow: RespondWindow;
  /** While recording: how long you have left, in ms; null until the mic is live (e.g. at the browser's prompt). */
  replyLeft: number | null;
  /** The voice playing right now (theirs, the static, or yours), for the glow. */
  level: RefObject<Level | null>;
  play: (message: RouteMessage) => void;
  toggleRespond: () => void;
  send: () => void;
  /** Stop listening, or throw away the reply you're recording. */
  skip: () => void;
};

export function useRouteMessage({ speaker }: { speaker: boolean }): RouteMessageControls {
  const [message, setMessage] = useState<RouteMessage | null>(null);
  const [phase, setPhase] = useState<MessagePhase>("idle");
  const [respond, setRespond] = useState(false);
  const [respondWindow, setWindow] = useState<RespondWindow>("waiting");
  const [replyLeft, setReplyLeft] = useState<number | null>(null);
  const level = useRef<Level | null>(null);
  const voice = useRef<Voice | null>(null);
  const recording = useRef<Recording | null>(null);
  // Read when their voice ends, so the latest choice counts.
  const respondRef = useRef(respond);
  const speakerRef = useRef(speaker);
  useEffect(() => {
    respondRef.current = respond;
  }, [respond]);
  useEffect(() => {
    speakerRef.current = speaker;
    voice.current?.setSpeaker(speaker);
  }, [speaker]);

  const play = useCallback((next: RouteMessage) => {
    setMessage(next);
    setRespond(false);
    setWindow("waiting");
    setPhase("tuning");
  }, []);

  const send = useCallback(async () => {
    const rec = recording.current;
    if (!rec) return;
    recording.current = null;
    level.current = null;
    const reply = await rec.stop();
    void reply; // Uploaded to the person who left the message once there's a backend.
    cue("success", { theme: "mech" });
    setPhase("sent");
  }, []);

  const skip = useCallback(() => setPhase("idle"), []);

  // You can opt in only while the window's open (or before it starts), but you can always back out.
  const toggleRespond = useCallback(() => {
    setRespond((r) => (r ? false : respondWindow !== "closed"));
  }, [respondWindow]);

  // Tuning in: static and a whistle, then their voice.
  useEffect(() => {
    if (phase !== "tuning") return;
    let live = true;
    level.current = staticLevel;
    void tuneIn().then(() => live && setPhase("playing"));
    return () => {
      live = false;
      level.current = null;
    };
  }, [phase]);

  // Their voice. The 5 seconds to respond start when it does.
  useEffect(() => {
    if (phase !== "playing" || !message) return;
    let live = true;
    let closing: ReturnType<typeof setTimeout> | undefined;
    const v = playVoice(message.src, speakerRef.current);
    voice.current = v;
    level.current = v.level;
    void v.started.then(() => {
      if (!live) return;
      setWindow("open");
      closing = setTimeout(() => setWindow("closed"), RESPOND_WINDOW_MS);
    });
    v.done.then(
      () => live && setPhase(respondRef.current ? "recording" : "idle"),
      () => live && setPhase("idle"),
    );
    return () => {
      live = false;
      clearTimeout(closing);
      v.stop();
      voice.current = null;
      level.current = null;
    };
  }, [phase, message]);

  // Your reply: a beep, then the mic is live for up to 60 seconds; it sends itself at the end.
  useEffect(() => {
    if (phase !== "recording") return;
    let live = true;
    let tick: ReturnType<typeof setInterval> | undefined;
    recordReply().then(
      (rec) => {
        if (!live) return rec.cancel();
        recording.current = rec;
        level.current = rec.level;
        // The beep says the mic is live, so it only plays once it is.
        cue("ready", { theme: "mech" });
        const start = Date.now();
        setReplyLeft(REPLY_MAX_MS);
        tick = setInterval(() => {
          const left = Math.max(0, REPLY_MAX_MS - (Date.now() - start));
          setReplyLeft(left);
          if (left === 0) void send();
        }, 250);
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
      recording.current?.cancel();
      recording.current = null;
      level.current = null;
      setReplyLeft(null);
    };
  }, [phase, send]);

  // "Sent" and "Mic is off" show for a moment, then the radio goes quiet again.
  useEffect(() => {
    if (phase !== "sent" && phase !== "noMic") return;
    const t = setTimeout(() => setPhase("idle"), NOTICE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  return { message, phase, respond, respondWindow, replyLeft, level, play, toggleRespond, send, skip };
}
