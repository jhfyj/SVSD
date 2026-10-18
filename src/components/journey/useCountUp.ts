"use client";

import { useEffect, useState } from "react";

/**
 * Counts up (or down) to `target` one whole number per frame, so a number
 * ticks 0, 1, 2… 29 instead of tweening. The whole count takes about
 * `duration` ms. Jumps straight to `target` for prefers-reduced-motion.
 */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (value === target) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = setTimeout(() => setValue(target));
      return () => clearTimeout(id);
    }
    const tick = Math.max(30, duration / Math.max(1, Math.abs(target - value)));
    const id = setTimeout(() => setValue((v) => v + Math.sign(target - v)), tick);
    return () => clearTimeout(id);
  }, [value, target, duration]);

  return value;
}
