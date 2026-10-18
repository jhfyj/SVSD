"use client";

import { useEffect } from "react";
import { applyTheme } from "@/lib/theme";

/** Keeps the theme in step with the clock: checks every minute and whenever the tab comes back. */
export function ThemeClock() {
  useEffect(() => {
    applyTheme();
    const id = setInterval(applyTheme, 60_000);
    const onVisible = () => document.visibilityState === "visible" && applyTheme();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", applyTheme);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", applyTheme);
    };
  }, []);
  return null;
}
