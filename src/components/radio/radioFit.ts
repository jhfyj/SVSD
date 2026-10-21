import { createContext, useContext } from "react";

/**
 * How much taller (or shorter, if negative) than 852 the radio is drawn, in its own px. Inside the
 * drawn phone it's 0: the radio is exactly 393 x 852. On a real phone the radio is scaled to the
 * phone's full width (FitScreen), and the map stretches or shrinks by this much so the radio fills the
 * height too. The console keeps its size and stays on the bottom edge.
 */
export const RadioExtra = createContext(0);

export function useRadioExtra() {
  return useContext(RadioExtra);
}

/** The map never gets shorter than this (its drawn height is 509). */
export const MIN_MAP_HEIGHT = 200;
