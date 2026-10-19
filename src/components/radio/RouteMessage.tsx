"use client";

import { ArrowBendUpLeft, PaperPlaneRight, SkipForward, X } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { formatCountdown } from "@/lib/radio/hangups";
import { RESPOND_WINDOW_MS } from "@/lib/radio/messages";
import { quietHint } from "@/lib/radio/quiet";
import type { Level } from "@/lib/radio/voice";
import type { MarkerColor } from "../ui/MapMarker";
import { cn } from "../ui/cn";
import { HardwareButton } from "./HardwareButton";
import type { RouteMessageControls } from "./useRouteMessage";

/*
  What a message on the road looks like on the radio (Figma "Message" 116:91, "Question" 116:131,
  and the RESPOND frames 116:169 / 116:200): the map takes on the marker's colour, the LCD says who
  it's from, and the console offers RESPOND for the first 5 seconds of their voice.
*/

/**
 * voice: their voice comes down from the top of the screen, the way it reaches you.
 * reply: your voice rises from the bottom, from the console and your mic.
 */
export type GlowMode = "off" | "voice" | "reply";

/** Size of one dithered pixel, in CSS px (the Figma dither's pixel size). */
const CELL = 3;
/** Alpha for each dither level: off, dim, lit. Three levels keep it reading as pixels, not a gradient. */
const ALPHA = [0, 0.4 * 255, 0.88 * 255];

/** An n × n ordered-dither (Bayer) matrix as thresholds in 0–1, row by row. */
function bayer(size: number) {
  let m = [[0]];
  while (m.length < size) {
    const n = m.length;
    const quad = [
      [0, 2],
      [3, 1],
    ];
    const prev = m;
    m = Array.from({ length: n * 2 }, (_, y) =>
      Array.from({ length: n * 2 }, (_, x) => 4 * prev[y % n][x % n] + quad[Math.floor(y / n)][Math.floor(x / n)]),
    );
  }
  return m.flat().map((v) => (v + 0.5) / (size * size));
}
const BAYER = bayer(8);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * How far each cell is from where the sound comes in, in half-widths of the screen (0 at the source).
 * The edge it comes from bows toward the middle, so the front reads as a wave, not a ruler line,
 * and the side edges lift a little near the source like the Figma corner glow.
 */
function fields(w: number, h: number) {
  const half = w / 2;
  const top = new Float32Array(w * h);
  const bottom = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const across = (x - (w - 1) / 2) / half; // -1 at the left edge, 1 at the right
      const bow = 0.12 * (1 - across * across);
      const side = 0.06 * Math.max(0, Math.abs(across) - 0.6) / 0.4;
      top[y * w + x] = Math.max(0, y / half - bow - side);
      bottom[y * w + x] = Math.max(0, (h - 1 - y) / half - bow - side);
    }
  }
  return { top, bottom };
}

function rgbOf(el: Element, color: MarkerColor): [number, number, number] {
  const hex = getComputedStyle(el).getPropertyValue(`--marker-${color}`).trim().replace("#", "");
  const n = parseInt(hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex, 16);
  return Number.isNaN(n) ? [236, 107, 242] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

type Ripple = { born: number; strength: number };

/** Your voice's glow (rising from the bottom) tops out at this share of the usual reach. */
const REPLY_PEAK = 0.5;

/**
 * A dithered glow over the map that moves with a voice. Its reach follows how loud they are, and
 * each syllable sends a wave of pixels rolling out from where the voice comes in: down from the
 * top for theirs, up from the bottom for yours. The middle of the screen (the road and you) stays
 * clear. A soft colour wash underneath tints the map like the Figma frames. Reduced motion: a still
 * glow, no waves.
 */
export function MessageGlow({
  mode,
  color,
  level,
  rest = 0.3,
  peak,
  className,
}: {
  mode: GlowMode;
  color: MarkerColor;
  level: RefObject<Level | null>;
  /**
   * How far up it sits while nobody's talking (half-widths of the screen). It still reaches the
   * same height at full voice. A call keeps this low so the quiet stretches don't cover the map.
   */
  rest?: number;
  /**
   * How far up it reaches at full voice, and how far its rings roll, as a share of the usual
   * (1 = the usual third of the screen). Your own voice (a reply, a drop, a call, the night
   * check-in) stops at REPLY_PEAK everywhere so a loud take doesn't climb over the road; theirs,
   * from the top, keeps the full reach. Pass a number to override either.
   */
  peak?: number;
  className?: string;
}) {
  const restRef = useRef(rest);
  const peakRef = useRef(peak);
  useEffect(() => {
    restRef.current = rest;
    peakRef.current = peak;
  }, [rest, peak]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tint = useRef<HTMLDivElement>(null);
  const modeRef = useRef(mode);
  const rgb = useRef<[number, number, number]>([236, 107, 242]);
  const wake = useRef(() => {});

  useEffect(() => {
    const cv = canvas.current;
    const g = cv?.getContext("2d");
    if (!cv || !g) return;
    let w = 0;
    let h = 0;
    let img = g.createImageData(1, 1);
    let field = fields(1, 1);
    const fit = () => {
      const r = cv.getBoundingClientRect();
      w = Math.max(1, Math.ceil(r.width / CELL));
      h = Math.max(1, Math.ceil(r.height / CELL));
      cv.width = w;
      cv.height = h;
      img = g.createImageData(w, h);
      field = fields(w, h);
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(cv);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");

    let presence = 0;
    let env = 0;
    let avg = 0;
    let lastOnset = 0;
    let ripples: Ripple[] = [];
    let frame = 0;
    let last = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const mode = modeRef.current;
      const target = mode === "off" ? 0 : 1;
      const still = reduce.matches;
      // Comes up over ~450ms, goes in ~300ms: leaving is faster than arriving.
      presence = still ? target : target > presence ? Math.min(1, presence + dt / 0.45) : Math.max(0, presence - dt / 0.3);
      if (presence === 0) {
        g.clearRect(0, 0, w, h);
        if (tint.current) tint.current.style.opacity = "0";
        ripples = [];
        env = avg = 0;
        frame = 0;
        return; // Asleep until the mode changes.
      }

      // Envelope: quick to rise with a syllable, slower to fall, so it breathes with the voice.
      const l = still ? 0.45 : (level.current?.() ?? 0);
      env += (l - env) * (1 - Math.exp(-dt / (l > env ? 0.04 : 0.22)));
      avg += (l - avg) * (1 - Math.exp(-dt / 0.8));
      if (!still && l > avg * 1.35 + 0.06 && now - lastOnset > 170) {
        ripples.push({ born: now, strength: Math.min(1, 0.35 + l) });
        lastOnset = now;
      }

      const reply = mode === "reply";
      const dist = reply ? field.bottom : field.top;
      // Both reach about a third of the screen at their loudest, then rings carry on and fade
      // before the middle, so the road and you always stay clear.
      const floor = restRef.current;
      const top = Math.max(floor, peakRef.current ?? (reply ? REPLY_PEAK : 1));
      const reach = floor + (top - floor) * env;
      const life = 1500;
      const travel = 1.3 * top;
      ripples = ripples.filter((r) => now - r.born < life);
      const rings = ripples.map((r) => {
        const p = (now - r.born) / life;
        return { front: p * travel, amp: r.strength * (1 - p) ** 2 * 0.85 };
      });
      const lift = 0.45 + 0.55 * env;
      const [cr, cg, cb] = rgb.current;
      const data = img.data;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const e = dist[i];
          const b = Math.max(0, 1 - e / reach);
          let v = b * b * lift;
          for (const ring of rings) v += ring.amp * Math.max(0, 1 - Math.abs(e - ring.front) / 0.06);
          const q = Math.min(2, Math.floor(clamp01(v * presence) * 2 + BAYER[(y & 7) * 8 + (x & 7)]));
          const p = i * 4;
          data[p] = cr;
          data[p + 1] = cg;
          data[p + 2] = cb;
          data[p + 3] = ALPHA[q];
        }
      }
      g.putImageData(img, 0, 0);
      // The colour wash rests lower too when the glow rests low (same 0.25 at the usual rest).
      if (tint.current) tint.current.style.opacity = String(presence * ((0.25 * floor) / 0.3 + 0.35 * env));
      frame = requestAnimationFrame(tick);
    };

    wake.current = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    wake.current();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      wake.current = () => {};
    };
  }, [level]);

  useEffect(() => {
    modeRef.current = mode;
    // Keep the last colour while it fades out, so a reply doesn't flash back to theirs.
    if (mode !== "off" && canvas.current && tint.current) {
      rgb.current = rgbOf(canvas.current, color);
      tint.current.style.background =
        `linear-gradient(to ${mode === "reply" ? "top" : "bottom"}, var(--marker-${color}) 0%, transparent 45%)`;
    }
    wake.current();
  }, [mode, color]);

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <div ref={tint} className="absolute inset-0 opacity-0 mix-blend-color" />
      <canvas ref={canvas} className="absolute inset-0 size-full [image-rendering:pixelated]" />
    </div>
  );
}

/** The LCD while a message plays: who it's from (as in Figma), then your reply's timer. */
export function MessageLcd({ controls }: { controls: RouteMessageControls }) {
  const { message, phase, respond, replyLeft, sendsIn } = controls;
  if (!message) return null;
  if (phase === "recording") {
    return (
      <Lcd>
        <span className="flex items-center gap-1.5 text-[11px]">
          <span aria-hidden className="caret-blink size-2 rounded-full bg-current" />
          YOUR REPLY
        </span>
        {replyLeft === null ? (
          <span className="mt-1 block text-[11px] normal-case">Waiting for the mic…</span>
        ) : (
          // The 60-second cap counting down, with who it's for beside it.
          <span className="mt-1 flex items-baseline gap-2">
            <span className="text-[28px] leading-none tabular-nums">{formatCountdown(replyLeft)}</span>
            <span className="min-w-0 truncate text-[11px] normal-case">to {message.from}</span>
          </span>
        )}
        {/* Same as a drop: gone quiet, it says when it sends itself. Talking again takes it back to the tap hint. */}
        {replyLeft !== null && <span className="mt-1.5 block text-[11px] normal-case">{quietHint(sendsIn)}</span>}
      </Lcd>
    );
  }
  if (phase === "empty") {
    return (
      <Lcd>
        NOTHING HEARD
        <span className="mt-1 block text-[11px] normal-case">No reply sent to {message.from}</span>
      </Lcd>
    );
  }
  if (phase === "sent") {
    return (
      <Lcd>
        REPLY SENT
        <span className="mt-1 block text-[11px] normal-case">to {message.from}</span>
      </Lcd>
    );
  }
  if (phase === "asking") {
    return (
      <Lcd>
        <span className="block text-[20px] font-medium leading-[1.2]">REPLY?</span>
        <span className="mt-1 block text-[11px] normal-case">
          {controls.listening ? "Say yes or no" : `Tap respond to answer ${message.from}`}
        </span>
      </Lcd>
    );
  }
  if (phase === "noMic") {
    return (
      <Lcd>
        MIC IS OFF
        <span className="mt-1 block text-[11px] normal-case">Turn it on in settings to reply</span>
      </Lcd>
    );
  }
  return (
    <Lcd>
      <span className="block text-[20px] font-medium leading-[1.2]">
        {message.kind === "question" ? "Question from" : "Message from"}
        <br />
        {message.from}
      </span>
      {respond && <span className="mt-2 block text-[11px]">Reply after they finish</span>}
      {phase === "playing" && message.transcript && (
        <span className="mt-2 block max-h-16 overflow-hidden text-[10px] normal-case leading-[1.35]">{message.transcript}</span>
      )}
    </Lcd>
  );
}

function Lcd({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="w-full px-[19px] text-left font-mono text-[14px] uppercase leading-tight text-lcd-ink">
      {children}
    </p>
  );
}

const SEGMENT_BG: Record<MarkerColor, string> = {
  lime: "bg-marker-lime",
  sky: "bg-marker-sky",
  magenta: "bg-marker-magenta",
  orange: "bg-marker-orange",
};

/**
 * The console keys while a message plays (Speaker and Settings stay beside them).
 * RESPOND: pressed in and lit once you choose to reply. A strip of 5 segments along its bottom
 * goes out one a second while you can still choose; after that it reads LISTENING.
 * Recording: SEND, and X to throw the reply away. The square key skips the message.
 */
export function MessageKeys({
  controls,
  color,
  squareKey,
}: {
  controls: RouteMessageControls;
  color: MarkerColor;
  squareKey: string;
}) {
  const { phase, respond, respondWindow, replyLeft, toggleRespond, send, skip } = controls;

  if (phase === "recording") {
    return (
      <>
        <HardwareButton className="flex-1" onClick={send} disabled={replyLeft === null} data-cuelume-emphasis="strong">
          <PaperPlaneRight size={22} className="opacity-80" aria-hidden />
          <span className="text-base font-bold opacity-80">SEND</span>
        </HardwareButton>
        <HardwareButton className={squareKey} onClick={skip} aria-label="Throw away reply" data-cuelume-tap="close">
          <X size={24} className="opacity-60" aria-hidden />
        </HardwareButton>
      </>
    );
  }

  const listening = phase === "playing" && respondWindow === "closed" && !respond;
  const done = phase === "sent" || phase === "empty" || phase === "noMic";
  const counting = (phase === "tuning" || phase === "playing") && respondWindow !== "closed";
  return (
    <>
      <div className="relative flex flex-1">
        <HardwareButton
          className="flex-1"
          pressed={respond}
          disabled={listening || done}
          onClick={toggleRespond}
          aria-label={respond ? "Don't respond" : "Respond after they finish"}
        >
          <ArrowBendUpLeft size={22} className="opacity-60" aria-hidden />
          <span className="text-base font-bold opacity-80">{listening ? "LISTENING" : "RESPOND"}</span>
        </HardwareButton>
        {/* Outside the key, so it doesn't move when the key sinks. Full while tuning in, then counts down. */}
        {counting && (
          <span
            aria-hidden
            className={cn("pointer-events-none absolute inset-x-4 bottom-2 flex gap-1", respond && "opacity-0")}
          >
            {[0, 1, 2, 3, 4].map((k) => (
              <span
                key={k}
                className={cn("h-[3px] flex-1", SEGMENT_BG[color], respondWindow === "open" && "respond-segment")}
                // The right-hand segment goes first: k = 4 at 1s ... k = 0 at 5s.
                style={{ animationDuration: `${((5 - k) * RESPOND_WINDOW_MS) / 5}ms` }}
              />
            ))}
          </span>
        )}
      </div>
      <HardwareButton
        className={squareKey}
        onClick={skip}
        disabled={done}
        aria-label={phase === "tuning" || phase === "playing" ? "Skip message" : phase === "asking" ? "Don't reply" : "Close"}
        data-cuelume-tap="close"
      >
        <SkipForward size={22} weight="fill" className="opacity-60" aria-hidden />
      </HardwareButton>
    </>
  );
}

