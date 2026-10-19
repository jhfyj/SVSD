"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { REPLY_MAX_MS, RESPOND_WINDOW_MS, type RouteMessage } from "@/lib/radio/messages";
import { playVoice, recordReply, tuneIn, type Level, type Recording, type Voice } from "@/lib/radio/voice";
import { QUESTION_UNLOCK, REPLY_PROMPT, START_TIMEOUT_MS } from "@/lib/radio/scriptVoice";
import { cue } from "@/lib/sound";
import { canRecognise, listenYesNo } from "@/lib/radio/yesNo";

/**
 * Where a message on the road is up to:
 * tuning (static, then the station locks), playing (their voice), asking (the radio's recorded
 * voice: "Would you like to reply to this message?", when you haven't already said yes), recording (your reply),
 * sent (a moment to say it went), noMic (you chose to respond but the mic is blocked), or idle.
 */
export type MessagePhase = "idle" | "tuning" | "playing" | "asking" | "recording" | "sent" | "noMic";

/** The 5 seconds to choose to respond: not started (still tuning in), open, or gone. */
export type RespondWindow = "waiting" | "open" | "closed";

/** How long "Sent" or "Mic is off" stays on the LCD. */
const NOTICE_MS = 1800;

/** After the radio asks, how long the mic stays open for a yes or no before it takes silence as no. */
const ANSWER_LISTEN_MS = 7000;
/** Without speech recognition, any voice this loud for this long counts as yes. */
const VOICE_LEVEL = 0.25;
const VOICE_MS = 300;

/** Static crackle while tuning in, so the glow flickers before the voice arrives. */
const staticLevel: Level = () => 0.2 + Math.random() * 0.3;

export type RouteMessageControls = {
  message: RouteMessage | null;
  phase: MessagePhase;
  /** You've chosen to respond: the radio records your reply when they finish. */
  respond: boolean;
  respondWindow: RespondWindow;
  /** Asking: the radio has asked and the mic is open for a spoken yes or no. */
  listening: boolean;
  /** While recording: how long you have left, in ms; null until the mic is live (e.g. at the browser's prompt). */
  replyLeft: number | null;
  /** The voice playing right now (theirs, the static, or yours), for the glow. */
  level: RefObject<Level | null>;
  play: (message: RouteMessage) => void;
  /** Straight to recording your reply to this message (a beep once the mic is live), e.g. after a spoken yes. */
  reply: (message: RouteMessage) => void;
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
  const [listening, setListening] = useState(false);
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

  const reply = useCallback((to: RouteMessage) => {
    setMessage(to);
    setRespond(true);
    setWindow("closed");
    setPhase("recording");
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
  // When the radio asks "Reply?", RESPOND is yes: your reply starts recording right away.
  const toggleRespond = useCallback(() => {
    if (phase === "asking") {
      setRespond(true);
      setPhase("recording");
      return;
    }
    setRespond((r) => (r ? false : respondWindow !== "closed"));
  }, [respondWindow, phase]);

  // Tuning in: the station locks (a silent pause), then their voice. A question unlocks out loud
  // instead, in the radio's recorded voice: "You just unlocked a question... Would you like to respond?"
  const kind = message?.kind;
  useEffect(() => {
    if (phase !== "tuning") return;
    let live = true;
    const next = () => live && setPhase("playing");
    if (kind === "question") {
      const v = playVoice(QUESTION_UNLOCK, true);
      voice.current = v;
      level.current = v.level;
      // If the browser holds it back, don't wait on it: the question still comes through.
      const held = setTimeout(next, START_TIMEOUT_MS);
      void v.started.then(() => clearTimeout(held));
      v.done.then(next, next);
      return () => {
        live = false;
        clearTimeout(held);
        v.stop();
        voice.current = null;
        level.current = null;
      };
    }
    level.current = staticLevel;
    void tuneIn().then(next);
    return () => {
      live = false;
      level.current = null;
    };
  }, [phase, kind]);

  // Their voice. The 5 seconds to respond start when it does.
  useEffect(() => {
    if (phase !== "playing" || !message) return;
    let live = true;
    let closing: ReturnType<typeof setTimeout> | undefined;
    // Only ElevenLabs takes are heard; the `say` placeholders play silently under the glow.
    const v = playVoice(message.src, speakerRef.current, { silent: !message.recorded });
    voice.current = v;
    level.current = v.level;
    void v.started.then(() => {
      if (!live) return;
      setWindow("open");
      closing = setTimeout(() => setWindow("closed"), RESPOND_WINDOW_MS);
    });
    v.done.then(
      // Already said yes: straight to your reply. Otherwise the radio asks.
      () => live && setPhase(respondRef.current ? "recording" : "asking"),
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

  // The radio asks, in its recorded voice: "Would you like to reply to this message? Reply with
  // yes or no." Then the mic opens and listens: say yes and your reply starts recording (after the
  // beep), say no and the radio goes quiet. RESPOND still means yes and the skip key no. Nothing
  // said for a few seconds is a no. If the mic is blocked, RESPOND works as before.
  useEffect(() => {
    if (phase !== "asking") return;
    let live = true;
    let grace: ReturnType<typeof setTimeout> | undefined;
    let held: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    let stopListening = () => {};
    let mic: Recording | null = null;
    const yes = () => {
      if (!live) return;
      setRespond(true);
      setPhase("recording");
    };
    const no = () => live && setPhase("idle");
    const open = () => {
      clearTimeout(held);
      if (!live || grace) return;
      level.current = null;
      grace = setTimeout(no, ANSWER_LISTEN_MS);
      recordReply().then(
        (rec) => {
          if (!live) return rec.cancel();
          mic = rec;
          // Your voice rises from the bottom while it listens, like a reply.
          level.current = rec.level;
          setListening(true);
          if (canRecognise()) {
            stopListening = listenYesNo((a) => (a === "yes" ? yes() : no()));
          } else {
            // No speech recognition here: speaking up at all is a yes.
            let loudSince: number | null = null;
            poll = setInterval(() => {
              const now = Date.now();
              if (rec.level() < VOICE_LEVEL) loudSince = null;
              else if (loudSince === null) loudSince = now;
              else if (now - loudSince >= VOICE_MS) yes();
            }, 50);
          }
        },
        // Mic blocked: RESPOND still works, the same few seconds as before.
        () => {},
      );
    };
    if (kind === "question") {
      // A question already asked out loud when it unlocked ("…Would you like to respond?"), so
      // the mic opens straight away.
      open();
    } else {
      const v = playVoice(REPLY_PROMPT, true);
      voice.current = v;
      level.current = v.level;
      // If the browser holds the prompt back, don't wait on it: the mic still opens.
      held = setTimeout(open, START_TIMEOUT_MS);
      void v.started.then(() => clearTimeout(held));
      v.done.then(open, open);
    }
    return () => {
      live = false;
      clearTimeout(held);
      clearTimeout(grace);
      clearInterval(poll);
      stopListening();
      mic?.cancel();
      voice.current?.stop();
      voice.current = null;
      level.current = null;
      setListening(false);
    };
  }, [phase, kind]);

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

  return { message, phase, respond, respondWindow, listening, replyLeft, level, play, reply, toggleRespond, send, skip };
}
