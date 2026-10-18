"use client";

import { useSyncExternalStore } from "react";

/** Phone numbers that have been through the Allow access screen, kept in localStorage. */
const KEY = "svsd.onboarded";
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cached: string[] = [];

function readAll(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? JSON.parse(raw) : [];
    } catch {
      cached = [];
    }
  }
  return cached;
}

function writeAll(next: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

export function markOnboarded(phone: string) {
  if (!readAll().includes(phone)) writeAll([...readAll(), phone]);
}

export function forgetOnboarded(phone: string) {
  writeAll(readAll().filter((p) => p !== phone));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Whether this account has seen Allow access; `undefined` until storage is read. */
export function useOnboarded(phone: string | undefined): boolean | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (phone ? readAll().includes(phone) : false),
    () => undefined,
  );
}
