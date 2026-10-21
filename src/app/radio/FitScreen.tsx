"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { MIN_MAP_HEIGHT, RadioExtra } from "@/components/radio/radioFit";

/** The radio is a 393 × 852 scale model (DESIGN.md §4.3). */
const W = 393;
const H = 852;
/** The map's drawn height; it can give up the difference down to MIN_MAP_HEIGHT. */
const MAP_H = 509;
/** Below this the app is the whole phone screen, not the drawn phone (globals.css, max-width: 599px). */
const PHONE = 600;

/**
 * On a real phone, the radio fills the screen edge to edge: it's scaled to the phone's full width, and
 * the map stretches or shrinks to take up whatever height is left (the console keeps its size at the
 * bottom). Only if the screen is so short the map would drop under MIN_MAP_HEIGHT does it shrink to fit
 * instead. Inside the drawn phone (a laptop or tablet) the screen is exactly 393 × 852, so it stays 1:1.
 * Everything that measures the radio already divides by its drawn width, so collecting a pickup still
 * lands in the LCD.
 */
export function FitScreen({ children }: { children: ReactNode }) {
  const [fit, setFit] = useState({ scale: 1, extra: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      if (window.innerWidth >= PHONE) return setFit({ scale: 1, extra: 0 });
      const vv = window.visualViewport;
      const w = vv?.width ?? window.innerWidth;
      const h = vv?.height ?? window.innerHeight;
      const minExtra = MIN_MAP_HEIGHT - MAP_H;
      let scale = w / W;
      let extra = h / scale - H;
      if (extra < minExtra) {
        // Too short to fill the width: shrink until the shortest map fits.
        scale = h / (H + minExtra);
        extra = minExtra;
      }
      setFit({ scale, extra: Math.floor(extra) });
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);
  const { scale, extra } = fit;
  const height = H + extra;
  return (
    <RadioExtra.Provider value={extra}>
      <div className="relative shrink-0 overflow-hidden" style={{ width: W * scale, height: height * scale }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height, transform: scale === 1 ? undefined : `scale(${scale})` }}>
          {children}
        </div>
      </div>
    </RadioExtra.Provider>
  );
}
