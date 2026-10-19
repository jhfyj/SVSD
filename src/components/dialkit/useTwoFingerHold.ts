"use client";

import { useEffect, useRef } from "react";

/** How long two fingers have to stay down, and how far either may wander, before it counts. */
const HOLD_MS = 600;
const SLOP_PX = 24;

/**
 * Calls `onHold` when two fingers rest on the screen for HOLD_MS without moving: the hidden way
 * into the flow picker while filming on a phone, so no prototype controls ever show on camera.
 * A pinch, a two-finger swipe or a lifted finger cancels it. Once it fires, the fingers lifting
 * don't also tap whatever was under them.
 */
export function useTwoFingerHold(onHold: () => void) {
  const latest = useRef(onHold);
  useEffect(() => {
    latest.current = onHold;
  }, [onHold]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let start = new Map<number, { x: number; y: number }>();
    let fired = false;
    const cancel = () => {
      clearTimeout(timer);
      timer = undefined;
    };
    const down = (e: TouchEvent) => {
      cancel();
      if (e.touches.length !== 2) return;
      start = new Map(Array.from(e.touches, (t) => [t.identifier, { x: t.clientX, y: t.clientY }]));
      timer = setTimeout(() => {
        timer = undefined;
        fired = true;
        navigator.vibrate?.(12);
        latest.current();
      }, HOLD_MS);
    };
    const move = (e: TouchEvent) => {
      if (!timer) return;
      for (const t of Array.from(e.touches)) {
        const from = start.get(t.identifier);
        if (!from || Math.hypot(t.clientX - from.x, t.clientY - from.y) > SLOP_PX) return cancel();
      }
    };
    const up = (e: TouchEvent) => {
      cancel();
      if (!fired) return;
      // Swallow the lift so it isn't read as a tap on the screen underneath.
      if (e.cancelable) e.preventDefault();
      if (e.touches.length === 0) fired = false;
    };
    const opts = { capture: true, passive: false } as const;
    window.addEventListener("touchstart", down, { capture: true, passive: true });
    window.addEventListener("touchmove", move, { capture: true, passive: true });
    window.addEventListener("touchend", up, opts);
    window.addEventListener("touchcancel", up, opts);
    return () => {
      cancel();
      window.removeEventListener("touchstart", down, { capture: true });
      window.removeEventListener("touchmove", move, { capture: true });
      window.removeEventListener("touchend", up, { capture: true });
      window.removeEventListener("touchcancel", up, { capture: true });
    };
  }, []);
}
