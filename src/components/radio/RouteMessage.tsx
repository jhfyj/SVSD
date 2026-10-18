"use client";

import { ArrowBendUpLeft, Check, PaperPlaneRight, SkipForward, X } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { formatCountdown } from "@/lib/radio/hangups";
import { RESPOND_WINDOW_MS } from "@/lib/radio/messages";
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
 * around: their voice closes in from all four edges at once, as if it fills the car.
 * reply: your voice rises from the bottom, from the console and your mic.
 */
export type GlowMode = "off" | "voice" | "around" | "reply";

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
 * and the side edges lift a little near the source like the Figma corner glow. `around` is the
 * nearest of all four edges, each bowed the same way, so the front closes in like a rounded frame.
 */
function fields(w: number, h: number) {
  const half = w / 2;
  const top = new Float32Array(w * h);
  const bottom = new Float32Array(w * h);
  const around = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const across = (x - (w - 1) / 2) / half; // -1 at the left edge, 1 at the right
      const down = (y - (h - 1) / 2) / (h / 2); // -1 at the top, 1 at the bottom
      const bow = 0.12 * (1 - across * across);
      const side = 0.06 * Math.max(0, Math.abs(across) - 0.6) / 0.4;
      top[y * w + x] = Math.max(0, y / half - bow - side);
      bottom[y * w + x] = Math.max(0, (h - 1 - y) / half - bow - side);
      const fromEnds = Math.min(y, h - 1 - y) / half - bow;
      const fromSides = Math.min(x, w - 1 - x) / half - 0.12 * (1 - down * down);
      around[y * w + x] = Math.max(0, Math.min(fromEnds, fromSides));
    }
  }
  return { top, bottom, around };
}

function rgbOf(el: Element, color: MarkerColor): [number, number, number] {
  const hex = getComputedStyle(el).getPropertyValue(`--marker-${color}`).trim().replace("#", "");
  const n = parseInt(hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex, 16);
  return Number.isNaN(n) ? [236, 107, 242] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

type Ripple = { born: number; strength: number };

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
  className,
}: {
  mode: GlowMode;
  color: MarkerColor;
  level: RefObject<Level | null>;
  className?: string;
}) {
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

    let rising = true;
    let shownAround = false;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const mode = modeRef.current;
      const target = mode === "off" ? 0 : 1;
      const still = reduce.matches;
      // Comes up over ~450ms, goes in ~300ms: leaving is faster than arriving.
      rising = target > presence;
      presence = still ? target : rising ? Math.min(1, presence + dt / 0.45) : Math.max(0, presence - dt / 0.3);
      // Remember the shape while it fades, so leaving "around" doesn't snap to the top.
      if (mode !== "off") shownAround = mode === "around";
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
      const around = shownAround;
      const dist = around ? field.around : reply ? field.bottom : field.top;
      // Both reach about a third of the screen at their loudest, then rings carry on and fade
      // before the middle, so the road and you always stay clear. From all four edges the reach is
      // shorter (four fronts meet sooner), so the middle still stays clear at the loudest.
      const reach = around ? 0.12 + 0.5 * env : 0.3 + 0.7 * env;
      const life = 1500;
      const travel = around ? 0.8 : 1.3;
      // From all four edges the glow eases (Emil's ease-out: quick to answer, gentle to settle),
      // in on the way up and out on the way down, instead of a straight ramp.
      const shown = around && !still ? (rising ? 1 - (1 - presence) ** 3 : presence ** 3) : presence;
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
          const q = Math.min(2, Math.floor(clamp01(v * shown) * 2 + BAYER[(y & 7) * 8 + (x & 7)]));
          const p = i * 4;
          data[p] = cr;
          data[p + 1] = cg;
          data[p + 2] = cb;
          data[p + 3] = ALPHA[q];
        }
      }
      g.putImageData(img, 0, 0);
      if (tint.current) tint.current.style.opacity = String(shown * (0.25 + 0.35 * env));
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
        mode === "around"
          ? `radial-gradient(ellipse at center, transparent 45%, var(--marker-${color}) 110%)`
          : `linear-gradient(to ${mode === "reply" ? "top" : "bottom"}, var(--marker-${color}) 0%, transparent 45%)`;
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
  const { message, phase, respond, replyLeft, asking } = controls;
  if (!message) return null;
  if (phase === "asking") {
    return (
      <Lcd>
        <span className="block text-[16px] leading-[1.2]">
          Respond to
          <br />
          {message.from}?
        </span>
        <span className="mt-2 flex items-center gap-1.5 text-[11px] normal-case">
          {/* The dot blinks once the radio is listening for your answer. */}
          <span aria-hidden className={cn("size-2 rounded-full bg-current", asking === "listening" ? "caret-blink" : "opacity-40")} />
          {asking === "listening" ? "Say yes or no" : "Listen…"}
        </span>
      </Lcd>
    );
  }
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
          <span className="mt-1 block text-[28px] leading-none">{formatCountdown(replyLeft)}</span>
        )}
        <span className="mt-1.5 block text-[11px] normal-case">to {message.from}</span>
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
  const { phase, respond, respondWindow, replyLeft, toggleRespond, answer, send, skip } = controls;

  if (phase === "asking") {
    return (
      <>
        <HardwareButton className="flex-1" onClick={() => answer("yes")} data-cuelume-emphasis="strong">
          <Check size={22} className="opacity-80" aria-hidden />
          <span className="text-base font-bold opacity-80">YES</span>
        </HardwareButton>
        <HardwareButton className={squareKey} onClick={() => answer("no")} aria-label="No" data-cuelume-tap="close">
          <span className="text-base font-bold opacity-80">NO</span>
        </HardwareButton>
      </>
    );
  }

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
  const done = phase === "sent" || phase === "noMic";
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
        aria-label={phase === "tuning" || phase === "playing" ? "Skip message" : "Close"}
        data-cuelume-tap="close"
      >
        <SkipForward size={22} weight="fill" className="opacity-60" aria-hidden />
      </HardwareButton>
    </>
  );
}

