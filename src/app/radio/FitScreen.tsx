"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { MAP_SIDE, MAP_TOP, MIN_MAP_HEIGHT, RadioFitContext, type RadioFit } from "@/components/radio/radioFit";

/** The radio is a 393 × 852 scale model (DESIGN.md §4.3). */
const W = 393;
const H = 852;
/** The map's drawn height; it can give up the difference down to MIN_MAP_HEIGHT. */
const MAP_H = 509;
/** Below this the app is the whole phone screen, not the drawn phone (globals.css, max-width: 599px). */
const PHONE = 600;

/** The phone's own room at the top (notch / status bar), in CSS px: 0 in a browser tab. */
function safeTop() {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;top:0;left:0;visibility:hidden;padding-top:env(safe-area-inset-top)";
  document.body.appendChild(probe);
  const px = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  return px;
}

/**
 * On a real phone, the radio fills the screen edge to edge: it's scaled to the phone's full width, the
 * empty band left above the map for the drawn phone's status bar is dropped (the map sits as far from
 * the top as from the sides), and the map stretches or shrinks to take whatever height is left (the
 * console keeps its size at the bottom). Only if the screen is so short the map would drop under
 * MIN_MAP_HEIGHT does it shrink to fit instead. Inside the drawn phone (a laptop or tablet) the screen
 * is exactly 393 × 852, so it stays 1:1. Everything that measures the radio already divides by its
 * drawn width, so collecting a pickup still lands in the LCD.
 */
export function FitScreen({ children }: { children: ReactNode }) {
  const [fit, setFit] = useState<RadioFit & { scale: number }>({ scale: 1, extra: 0, lift: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      if (window.innerWidth >= PHONE) return setFit({ scale: 1, extra: 0, lift: 0 });
      const vv = window.visualViewport;
      const w = vv?.width ?? window.innerWidth;
      const h = vv?.height ?? window.innerHeight;
      let scale = w / W;
      const liftAt = (s: number) => Math.max(0, MAP_TOP - (MAP_SIDE + safeTop() / s));
      let lift = liftAt(scale);
      // The map is MAP_H + extra + lift tall; it may not go under MIN_MAP_HEIGHT.
      let extra = h / scale - H;
      if (MAP_H + extra + lift < MIN_MAP_HEIGHT) {
        // Too short to fill the width: shrink until the shortest map fits.
        scale = h / (H + MIN_MAP_HEIGHT - MAP_H - lift);
        lift = liftAt(scale);
        extra = h / scale - H;
      }
      setFit({ scale, extra: Math.floor(extra), lift: Math.round(lift) });
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);
  const { scale, extra, lift } = fit;
  const height = H + extra;
  return (
    <RadioFitContext.Provider value={{ extra, lift }}>
      <div className="relative shrink-0 overflow-hidden" style={{ width: W * scale, height: height * scale }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height, transform: scale === 1 ? undefined : `scale(${scale})` }}>
          {children}
        </div>
      </div>
    </RadioFitContext.Provider>
  );
}
