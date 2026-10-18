"use client";

import { useSyncExternalStore } from "react";

/**
 * Phone sign in, mocked on the client: there's no SMS provider yet, so `sendCode` only waits
 * and `verifyCode` accepts any 6 digits except 000000 (kept as the "wrong code" case for testing).
 * The session lives in localStorage. Swap these two functions for real API calls later.
 */
export type Session = { phone: string; joinedAt: string };

const KEY = "svsd.session";
const listeners = new Set<() => void>();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendCode(phone: string) {
  await wait(600);
  return { phone };
}

export async function verifyCode(phone: string, code: string): Promise<Session> {
  await wait(600);
  if (!/^\d{6}$/.test(code) || code === "000000") throw new Error("That code didn't match. Try again.");
  const existing = readSession();
  const session = existing?.phone === phone ? existing : { phone, joinedAt: new Date().toISOString() };
  writeSession(session);
  return session;
}

export function signOut() {
  writeSession(null);
}

/** Mock only: forget the account on this device. */
export function deleteAccount() {
  writeSession(null);
}

let cachedRaw: string | null = null;
let cached: Session | null = null;

function readSession(): Session | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      cached = null;
    }
  }
  return cached;
}

function writeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
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

/** The signed-in session; `undefined` until the client has read storage. */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribe, readSession, () => undefined);
}
