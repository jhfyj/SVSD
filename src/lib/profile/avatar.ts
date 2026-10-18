"use client";

import { useSyncExternalStore } from "react";
import type { CharacterId } from "./characters";

/**
 * Which character each account picked, kept in localStorage by phone number (mocked like the
 * session in src/lib/auth/session.ts). An account with no character yet is new and gets the
 * Customize profile screen right after signing up.
 */
const KEY = "svsd.avatars";
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cached: Record<string, CharacterId> = {};

function readAll(): Record<string, CharacterId> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? JSON.parse(raw) : {};
    } catch {
      cached = {};
    }
  }
  return cached;
}

function writeAll(next: Record<string, CharacterId>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

export function saveCharacter(phone: string, character: CharacterId) {
  writeAll({ ...readAll(), [phone]: character });
}

export function forgetCharacter(phone: string) {
  const rest = { ...readAll() };
  delete rest[phone];
  writeAll(rest);
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

/** The account's character: `null` if it hasn't picked one, `undefined` until storage is read. */
export function useCharacter(phone: string | undefined): CharacterId | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (phone ? (readAll()[phone] ?? null) : null),
    () => undefined,
  );
}
