"use client";

import { useEffect } from "react";
import { startSound } from "@/lib/sound";

/** Mounted once in the root layout: turns on the app's interaction sounds. */
export function SoundProvider() {
  useEffect(() => startSound(), []);
  return null;
}
