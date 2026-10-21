import { createContext, useContext } from "react";

/**
 * How the radio is fitted to a real phone, in its own px (all 0 inside the drawn phone, where the
 * radio is exactly 393 x 852).
 *
 * extra: how much taller (or shorter, if negative) than 852 the radio is drawn. The radio is scaled
 *   to the phone's full width (FitScreen), and the map stretches or shrinks by this much so the radio
 *   fills the height too. The console keeps its size and stays on the bottom edge.
 * lift: how much of the 64px band above the map is dropped. That band was room for the drawn phone's
 *   9:41 status bar; a real phone has no fake bar, so the map moves up to sit the same 14px from the
 *   top as from the sides (plus the phone's own notch room, if any), and grows by as much.
 */
export type RadioFit = { extra: number; lift: number };

export const RadioFitContext = createContext<RadioFit>({ extra: 0, lift: 0 });

export function useRadioFit() {
  return useContext(RadioFitContext);
}

/** The map never gets shorter than this (its drawn height is 509). */
export const MIN_MAP_HEIGHT = 200;
/** The map's drawn top edge, and the margin it keeps at the sides. */
export const MAP_TOP = 64;
export const MAP_SIDE = 14;
