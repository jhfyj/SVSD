"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { REPLY_MAX_MS, RESPOND_WINDOW_MS, type RouteMessage } from "@/lib/radio/messages";
import { announce, listenYesNo, playVoice, recordReply, tuneIn, type Answer, type Level, type Recording, type Voice } from "@/lib/radio/voice";
import { cue } from "@/lib/sound";

/**
 * Where a message on the road is up to:
 * tuning (static, then the station locks), playing (their voice), asking (the radio asks if you want
 * to respond, for messages that ask), recording (your reply), sent (a moment to say it went),
 * noMic (you chose to respond but the mic is blocked), or idle.
 */
export type MessagePhase = "idle" | "tuning" | "playing" | "asking" | "recording" | "sent" | "noMic";

/** The 5 seconds to choose to respond: not started (still tuning in), open, or gone. */
export type RespondWindow = "waiting" | "open" | "closed";

/** How long "Sent" or "Mic is off" stays on the LCD. */
const NOTICE_MS = 1800;
/** After the radio asks, how long it listens for a yes or a no before taking it as a no. */
const ANSWER_MS = 7000;

/** Static crackle while tuning in, so the glow flickers before the voice arrives. */
const staticLevel: Level = () => 0.2 + Math.random() * 0.3;

export type RouteMessageControls = {
  message: RouteMessage | null;
  phase: MessagePhase;
  /** You've chosen to respond: the radio records your reply when they finish. */
  respond: boolean;
  respondWindow: RespondWindow;
  /** While asking: the radio is still saying the question, or it's listening for your answer. */
  asking: "speaking" | "listening" | null;
  /** While recording: how long you have left, in ms; null until the mic is live (e.g. at the browser's prompt). */
  replyLeft: number | null;
  /** The voice playing right now (theirs, the static, or yours), for the glow. */
  level: RefObject<Level | null>;
  play: (message: RouteMessage) => void;
  toggleRespond: () => void;
  /** Answer the radio's question with a key (saying it out loud does the same). */
  answer: (answer: Answer) => void;
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
  // Set once the question's been asked; whether it's still asking comes from the phase.
  const [listeningForAnswer, setListeningForAnswer] = useState(false);
  const asking = phase === "asking" ? (listeningForAnswer ? "listening" : "speaking") : null;
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

  // Yes goes straight to recording your reply; no is acknowledged, and the drive carries on.
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const answer = useCallback((a: Answer) => {
    if (phaseRef.current !== "asking") return;
    phaseRef.current = a === "yes" ? "recording" : "idle";
    if (a === "no") announce("Okay.");
    setPhase(phaseRef.current);
  }, []);

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
    const v = playVoice(message.src, speakerRef.current, { radio: message.radio });
    voice.current = v;
    level.current = v.level;
    void v.started.then(() => {
      if (!live) return;
      setWindow("open");
      closing = setTimeout(() => setWindow("closed"), RESPOND_WINDOW_MS);
    });
    v.done.then(
      // Already chose to respond: straight to your reply. Otherwise a message that asks, asks.
      () => live && setPhase(respondRef.current ? "recording" : message.ask ? "asking" : "idle"),
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

  // Asking: the radio's voice asks, then a beep, and it listens for a yes or a no (the keys work too).
  // No answer in time counts as a no.
  useEffect(() => {
    if (phase !== "asking" || !message?.ask) return;
    let live = true;
    let listening: ReturnType<typeof listenYesNo> | null = null;
    const line = announce(message.ask);
    void line.done.then(async () => {
      if (!live) return;
      cue("ready", { emphasis: "subtle", theme: "mech" });
      setListeningForAnswer(true);
      listening = listenYesNo(ANSWER_MS);
      const heard = await listening.result;
      if (live) answer(heard ?? "no");
    });
    return () => {
      live = false;
      line.stop();
      listening?.stop();
      setListeningForAnswer(false);
    };
  }, [phase, message, answer]);

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

  return { message, phase, respond, respondWindow, asking, replyLeft, level, play, toggleRespond, answer, send, skip };
}
