"use client";

import { useSyncExternalStore } from "react";

/**
 * The language each account talks in, picked right after the avatar on sign-up. Kept in
 * localStorage by phone number (mocked like the session and the avatar).
 */
export const LANGUAGES = [
  { id: "en", name: "English", english: "English" },
  { id: "es", name: "Español", english: "Spanish" },
  { id: "zh", name: "中文", english: "Chinese" },
  { id: "vi", name: "Tiếng Việt", english: "Vietnamese" },
  { id: "ko", name: "한국어", english: "Korean" },
  { id: "pa", name: "ਪੰਜਾਬੀ", english: "Punjabi" },
  { id: "ru", name: "Русский", english: "Russian" },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]["id"];
export const DEFAULT_LANGUAGE: LanguageId = "en";

const KEY = "svsd.languages";
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cached: Record<string, LanguageId> = {};

function readAll(): Record<string, LanguageId> {
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

function writeAll(next: Record<string, LanguageId>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

export function saveLanguage(phone: string, language: LanguageId) {
  writeAll({ ...readAll(), [phone]: language });
}

export function forgetLanguage(phone: string) {
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

/** The account's language: `null` if it hasn't picked one, `undefined` until storage is read. */
export function useLanguage(phone: string | undefined): LanguageId | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (phone ? (readAll()[phone] ?? null) : null),
    () => undefined,
  );
}
