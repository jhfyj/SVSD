"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

export type PressTiltOptions = {
  /** Degrees the face tips back at most, when you press right at its edge. */
  tilt?: number;
  /** Px the whole face sinks straight back, even when pressed dead center. */
  sink?: number;
  /** Px from the viewer to the face. Bigger parts want a longer one so the tilt stays believable. */
  perspective?: number;
};

const RAD = Math.PI / 180;
const clamp = (n: number) => Math.max(-1, Math.min(1, n));

/**
 * Press tilt — pointer down on the Start your journey square and the tab bar keys
 *   pivot:   the edge opposite your finger: the face tips back toward where you press and sinks by
 *            however far its near edge would have come forward, so no part of it ever comes toward you
 *   view:    `perspective` (600 for the square, 320 for a key), straight on
 *   travel:  rest → up to `tilt`° toward the press point, plus `sink` px straight back; it follows
 *            your finger while held
 *   curve:   in ease-out, out ease-mechanical (a small overshoot as it springs back)
 *   time:    press in, quick out
 *   light:   `shade` (hardware only) darkens the side that went back, by how far it tipped
 *   sound:   none here; the element's own data-cuelume-* plays on click
 *   reduced: no tilt; the element's pressed material or fill still shows it's down
 *
 * Bind `handlers` to the pressable, `face` to the part that moves (it must sit at rest, untransformed,
 * when pressed, since its box is read on pointer down). Keyboard presses don't tilt: they're instant.
 */
export function usePressTilt<T extends HTMLElement = HTMLElement>({ tilt = 6, sink = 4, perspective = 600 }: PressTiltOptions = {}) {
  const face = useRef<T>(null);
  const shade = useRef<HTMLSpanElement>(null);
  const box = useRef<DOMRect | null>(null);
  const holding = useRef(false);
  const [held, setHeld] = useState(false);

  // Start from an explicit flat transform so the first press interpolates the same functions.
  useEffect(() => {
    if (face.current) face.current.style.transform = `perspective(${perspective}px) translateZ(0px) rotateX(0deg) rotateY(0deg)`;
  }, [perspective]);

  const lean = (e: PointerEvent) => {
    const el = face.current;
    const r = box.current;
    if (!el || !r || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let nx = clamp(((e.clientX - r.left) / r.width) * 2 - 1);
    let ny = clamp(((e.clientY - r.top) / r.height) * 2 - 1);
    // A corner tips as far as an edge, not twice as far.
    const reach = Math.hypot(nx, ny);
    if (reach > 1) {
      nx /= reach;
      ny /= reach;
    }
    // rotateY(+) sends the right side back; rotateX(+) sends the top back.
    const ry = nx * tilt;
    const rx = -ny * tilt;
    const lift = (r.width / 2) * Math.sin(Math.abs(ry) * RAD) + (r.height / 2) * Math.sin(Math.abs(rx) * RAD);
    el.style.transition = "transform var(--motion-press) var(--motion-ease-out)";
    el.style.transform = `perspective(${perspective}px) translateZ(${-(sink + lift)}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    if (shade.current) {
      // Dark on the side you pressed, fading toward the hinge.
      shade.current.style.background = `linear-gradient(${Math.atan2(-nx, ny) / RAD}deg, rgb(0 0 0 / 0.28), transparent 75%)`;
      shade.current.style.opacity = String(Math.min(1, Math.hypot(nx, ny)));
    }
  };

  const release = () => {
    if (!holding.current) return;
    holding.current = false;
    setHeld(false);
    const el = face.current;
    if (el) {
      el.style.transition = "transform var(--motion-quick) var(--motion-ease-mechanical)";
      el.style.transform = `perspective(${perspective}px) translateZ(0px) rotateX(0deg) rotateY(0deg)`;
    }
    if (shade.current) shade.current.style.opacity = "0";
  };

  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0 || !face.current) return;
      box.current = face.current.getBoundingClientRect();
      holding.current = true;
      setHeld(true);
      lean(e);
    },
    onPointerMove: (e: PointerEvent) => {
      if (holding.current) lean(e);
    },
    onPointerUp: release,
    onPointerLeave: release,
    onPointerCancel: release,
  };

  return { face, shade, held, handlers };
}
