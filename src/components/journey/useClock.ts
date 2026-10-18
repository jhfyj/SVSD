"use client";

import { useSyncExternalStore } from "react";

const subscribe = (tick: () => void) => {
  const id = setInterval(tick, 15000);
  return () => clearInterval(id);
};
const read = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** The time on this device, e.g. "3:30 AM". Empty on the server so hydration matches. */
export function useClock() {
  return useSyncExternalStore(subscribe, read, () => "");
}
