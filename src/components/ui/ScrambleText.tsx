"use client";

import { useLayoutEffect, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>?!@$";
/** How often a still-scrambling letter flips to a new glyph. */
const TICK = 45;

export type ScrambleOptions = {
  /** ms from the first letter settling to the last one settling. */
  duration?: number;
  /** ms before the first letter settles. */
  delay?: number;
};

/** Cheap deterministic hash, so the server and client render the same glyphs. */
function hash(a: number, b: number) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function frame(text: string, t: number, { duration = 650, delay = 150 }: ScrambleOptions) {
  const tick = Math.floor(t / TICK);
  const n = Math.max(text.length - 1, 1);
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    // Letters settle roughly left to right, with a little jitter so it doesn't read as a wipe.
    const settle = delay + (i / n) * duration * 0.75 + (hash(i, 7) % 1000) / 1000 * duration * 0.25;
    out += ch.trim() === "" || t >= settle ? ch : GLYPHS[hash(i, tick) % GLYPHS.length];
  }
  return out;
}

/**
 * Scrambles `text` through random letters and symbols, settling into the real
 * characters left to right. Restarts whenever `text` changes. Shows the plain
 * text straight away for prefers-reduced-motion.
 */
export function useScramble(text: string, options: ScrambleOptions = {}) {
  const { duration = 650, delay = 150 } = options;
  const [t, setT] = useState(0);

  useLayoutEffect(() => {
    const total = delay + duration;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let start: number | undefined;
    let raf = requestAnimationFrame(function step(now) {
      if (reduced) return setT(Infinity);
      start ??= now;
      const elapsed = now - start;
      setT(elapsed >= total ? Infinity : elapsed);
      if (elapsed < total) raf = requestAnimationFrame(step);
    });
    setT(reduced ? Infinity : 0);
    return () => cancelAnimationFrame(raf);
  }, [text, duration, delay]);

  return t === Infinity ? text : frame(text, t, { duration, delay });
}

export type ScrambleTextProps = ScrambleOptions & { children: string; className?: string };

/**
 * Load-in for large text: put it inside a heading, e.g.
 * `<h1 className="text-xl"><ScrambleText>Customize profile</ScrambleText></h1>`.
 * Screen readers get the real text; the scrambling copy is hidden from them.
 * Relies on a monospace font so the line doesn't jump while letters change.
 */
export function ScrambleText({ children, className, ...options }: ScrambleTextProps) {
  const shown = useScramble(children, options);
  return (
    <span className={className}>
      <span className="sr-only">{children}</span>
      <span aria-hidden>{shown}</span>
    </span>
  );
}
