"use client";

import { useSyncExternalStore } from "react";

/**
 * Each account's subscription plan, kept in localStorage by phone number (mocked like the language
 * and the avatar: nothing is charged). The tiers follow the deck's money slide: talking is always
 * free, Caravan+ takes the ads away and keeps the stories you love, Enterprise is paid by carriers
 * and fleets per driver, and the company only ever sees seat counts.
 */
export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    blurb: "Talk, listen and leave stories. Ads only while you wait to connect.",
  },
  {
    id: "plus",
    name: "Caravan+",
    // Placeholder: the deck doesn't set a Caravan+ price yet.
    price: "$4.99/mo",
    blurb: "No ads. Keep the stories you love.",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$5/driver/mo",
    blurb: "Paid by your carrier or fleet. They only ever see seat counts.",
  },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];
export const DEFAULT_PLAN: PlanId = "free";

const KEY = "svsd.plans";
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cached: Record<string, PlanId> = {};

function readAll(): Record<string, PlanId> {
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

function writeAll(next: Record<string, PlanId>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

export function savePlan(phone: string, plan: PlanId) {
  writeAll({ ...readAll(), [phone]: plan });
}

export function forgetPlan(phone: string) {
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

/** The account's plan: Free until it upgrades. */
export function usePlan(phone: string | undefined): PlanId {
  return useSyncExternalStore(
    subscribe,
    () => (phone ? (readAll()[phone] ?? DEFAULT_PLAN) : DEFAULT_PLAN),
    () => DEFAULT_PLAN,
  );
}
