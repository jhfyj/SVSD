"use client";

import { useSyncExternalStore } from "react";

/**
 * Each account's @handle (username), kept in localStorage by phone number, mocked like the
 * character in ./avatar.ts. A new account gets a random road-trip one on Customize profile
 * (NightOwl-style: SleepyComet42), which it can change or reroll before Save. Accounts from
 * before handles existed show @traveller + the last 4 digits until they pick one.
 * No backend yet, so nothing checks whether someone else already has the same handle.
 */
const KEY = "svsd.handles";
const listeners = new Set<() => void>();

/** Letters, numbers and underscores, 3 to 16 of them (the @ isn't part of it). */
export const HANDLE_MAX = 16;
const VALID = new RegExp(`^[A-Za-z0-9_]{3,${HANDLE_MAX}}$`);

const FIRST = ["Sleepy", "Quiet", "Lucky", "Midnight", "Dusty", "Neon", "Rusty", "Lone", "Sunny", "Misty", "Wandering", "Cosmic", "Velvet", "Highway", "Late", "Little"];
const SECOND = ["Owl", "Comet", "Mile", "Moth", "Coyote", "Fox", "Lantern", "Raven", "Rider", "Signal", "Tumbleweed", "Ghost", "Static", "Drifter", "Firefly", "Exit"];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/**
 * A fresh random handle, without the @ (e.g. MidnightComet07). Some pairs run past HANDLE_MAX
 * (MidnightTumbleweed14 is 20), which would grey out Save, so those are drawn again.
 */
export function randomHandle() {
  for (;;) {
    const handle = `${pick(FIRST)}${pick(SECOND)}${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`;
    if (handle.length <= HANDLE_MAX) return handle;
  }
}

/** What's typed, minus a leading @ and anything a handle can't hold. */
export function cleanHandle(typed: string) {
  return typed.replace(/^@+/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, HANDLE_MAX);
}

export function handleError(handle: string): string | null {
  if (VALID.test(handle)) return null;
  if (handle.length < 3) return "At least 3 letters or numbers.";
  if (handle.length > HANDLE_MAX) return `Up to ${HANDLE_MAX} letters or numbers.`;
  return "Letters, numbers and _ only.";
}

/** Stand-in for accounts that haven't picked one: @traveller + the phone's last 4 digits. */
export const fallbackHandle = (phone: string) => `traveller${phone.slice(-4)}`;

let cachedRaw: string | null = null;
let cached: Record<string, string> = {};

function readAll(): Record<string, string> {
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

function writeAll(next: Record<string, string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

export function saveHandle(phone: string, handle: string) {
  writeAll({ ...readAll(), [phone]: cleanHandle(handle) });
}

export function forgetHandle(phone: string) {
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

/** The account's own handle (no @): `null` if it hasn't picked one, `undefined` until storage is read. */
export function useHandle(phone: string | undefined): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (phone ? (readAll()[phone] ?? null) : null),
    () => undefined,
  );
}
