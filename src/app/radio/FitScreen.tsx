"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";

/** The radio is a 393 × 852 scale model (DESIGN.md §4.3). */
const W = 393;
const H = 852;
/** Below this the app is the whole phone screen, not the drawn phone (globals.css, max-width: 599px). */
const PHONE = 600;

/**
 * On a real phone, shrinks the radio to fit the screen it's on, so the whole thing (map down to the
 * key row) shows when the browser leaves less than 852px of height. Never scales up. Inside the drawn
 * phone (a laptop or tablet) the screen is exactly 393 × 852, so it stays 1:1. Everything that
 * measures the radio already divides by its drawn width, so collecting a pickup still lands in the LCD.
 */
export function FitScreen({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const fit = () => {
      const vv = window.visualViewport;
      const w = vv?.width ?? window.innerWidth;
      const h = vv?.height ?? window.innerHeight;
      setScale(window.innerWidth >= PHONE ? 1 : Math.min(1, w / W, h / H));
    };
    fit();
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, []);
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ width: W * scale, height: H * scale }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: scale === 1 ? undefined : `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
