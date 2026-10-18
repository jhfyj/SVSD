"use client";

import type { RefObject } from "react";
import { useEffect } from "react";

/*
  Feeds how the phone is tilted into CSS, so the radio's lighting can follow it.
  Sets --tilt-x and --tilt-y on the element, each eased toward -1…1: x is left/right (gamma),
  y is toward/away from you (beta), relative to how the phone was held when the screen opened.
  Written straight to the style, not React state, so it runs every frame without re-rendering.

  iOS only shares motion after a tap, so the first tap on the radio asks for it. Without a
  motion sensor (desktops), the pointer stands in for the tilt.
*/

/** Degrees of tilt that reach the edge of the range. */
const RANGE_X = 25;
const RANGE_Y = 20;
/** How quickly the light catches up each frame (0–1): low enough to feel weighty, not jittery. */
const EASE = 0.12;

type MotionPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

export function useTilt(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: 0, y: 0 };
    const now = { x: 0, y: 0 };
    let rest: { beta: number; gamma: number } | null = null;
    let sensed = false;
    let frame = 0;

    const clamp = (v: number) => Math.max(-1, Math.min(1, v));

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      sensed = true;
      rest ??= { beta: e.beta, gamma: e.gamma };
      target.x = clamp((e.gamma - rest.gamma) / RANGE_X);
      target.y = clamp((e.beta - rest.beta) / RANGE_Y);
    };

    const onPointer = (e: PointerEvent) => {
      if (sensed || e.pointerType !== "mouse") return;
      const box = el.getBoundingClientRect();
      target.x = clamp(((e.clientX - box.left) / box.width) * 2 - 1);
      target.y = clamp(((e.clientY - box.top) / box.height) * 2 - 1);
    };

    // iOS 13+: motion needs a permission prompt, and only a tap can show it.
    const Orientation = window.DeviceOrientationEvent as unknown as MotionPermission | undefined;
    const ask = () => {
      Orientation?.requestPermission?.()
        .then((state) => state === "granted" && window.addEventListener("deviceorientation", onOrient))
        .catch(() => {});
    };
    if (Orientation?.requestPermission) el.addEventListener("pointerdown", ask, { once: true });
    else window.addEventListener("deviceorientation", onOrient);
    window.addEventListener("pointermove", onPointer);

    const tick = () => {
      now.x += (target.x - now.x) * EASE;
      now.y += (target.y - now.y) * EASE;
      el.style.setProperty("--tilt-x", now.x.toFixed(3));
      el.style.setProperty("--tilt-y", now.y.toFixed(3));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerdown", ask);
      window.removeEventListener("deviceorientation", onOrient);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [ref]);
}
