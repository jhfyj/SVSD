"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { ToggleSwitch } from "../radio/ToggleSwitch";
import { PixelIcon } from "./LcdIcon";
import { usePermission, type PermissionKind, type PermissionState } from "@/lib/permissions";

const ITEMS: { kind: PermissionKind; label: string; why: string; delay: number }[] = [
  { kind: "microphone", label: "MICROPHONE", why: "Talk and reply.", delay: 0 },
  { kind: "notifications", label: "NOTIFICATIONS", why: "When a message comes in.", delay: 400 },
  { kind: "location", label: "LOCATION", why: "Find stories nearby.", delay: 800 },
];

/** What to do when the browser won't ask again. */
const HINT: Partial<Record<PermissionState, Record<PermissionKind, string>>> = {
  denied: {
    microphone: "Blocked. Allow it in your phone's Settings.",
    notifications: "Blocked. Allow it in your browser's settings.",
    location: "Blocked. Allow it in your phone's Settings.",
  },
  unsupported: {
    microphone: "This browser can't use the microphone. Try Safari or Chrome.",
    notifications: "On iPhone, add SVSD to your Home Screen first (Share › Add to Home Screen), then turn notifications on.",
    location: "This browser can't share your location.",
  },
};

/** Which switches the person flipped on, per device. Starts empty, so every switch starts OFF. */
const SWITCHES_KEY = "svsd-access-switches";

const switchListeners = new Set<() => void>();

function subscribeSwitches(listener: () => void) {
  switchListeners.add(listener);
  return () => void switchListeners.delete(listener);
}

function readSwitches() {
  try {
    return localStorage.getItem(SWITCHES_KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function useSwitches() {
  const raw = useSyncExternalStore(subscribeSwitches, readSwitches, () => "{}");
  const on = useMemo<Partial<Record<PermissionKind, boolean>>>(() => {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }, [raw]);
  const set = useCallback((kind: PermissionKind, value: boolean) => {
    try {
      localStorage.setItem(SWITCHES_KEY, JSON.stringify({ ...JSON.parse(readSwitches()), [kind]: value }));
    } catch {}
    switchListeners.forEach((l) => l());
  }, []);
  return [on, set] as const;
}

export type AccessRowProps = {
  kind: PermissionKind;
  state: PermissionState;
  /** The row's switch. Off until the person flips it, even if the browser already allows it. */
  on?: boolean;
  onToggle?: (on: boolean) => void;
};

/** One permission: LCD icon, what it's for in a few words, and a switch. */
export function AccessRow({ kind, state, on = false, onToggle }: AccessRowProps) {
  const item = ITEMS.find((i) => i.kind === kind)!;
  const hint = HINT[state]?.[kind];
  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-center gap-3 border border-border p-3">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center bg-lcd text-lcd-ink shadow-[var(--lcd-inset)]">
          <PixelIcon icon={kind} pixel={2} delay={item.delay} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-base leading-5">{item.label}</span>
          <span className="text-xs text-foreground/70">{item.why}</span>
        </div>
        {state === "unsupported" ? (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-foreground/70">
            <span aria-hidden className="size-2 rounded-full border border-current" />
            N/A
          </span>
        ) : (
          <ToggleSwitch
            on={on}
            onChange={(next) => onToggle?.(next)}
            label={item.label.toLowerCase()}
            // No OFF / ON words here: the switch position says it, and the row stays short.
            labels={false}
            className="shrink-0"
          />
        )}
      </div>
      {hint && <p className="text-xs text-foreground/70">{hint}</p>}
    </li>
  );
}

export type AllowAccessViewProps = {
  states: Record<PermissionKind, PermissionState>;
  onAllow?: (kind: PermissionKind) => void;
  onDone: () => void;
  onBack?: () => void;
  /** The first time it's a step in sign-up; from Settings it's just a page. */
  firstTime?: boolean;
};

/** Allow access: shown once after sign-up, and from Settings on the profile. */
export function AllowAccessView({ states, onAllow, onDone, onBack, firstTime = true }: AllowAccessViewProps) {
  const [saved, save] = useSwitches();
  // Sign-up always opens with every switch OFF (even for a second test account on this device);
  // Settings shows what was flipped. Either way, flips are saved for Settings.
  const [fresh, setFresh] = useState<Partial<Record<PermissionKind, boolean>>>({});
  const switches = firstTime ? fresh : saved;
  const setSwitch = (kind: PermissionKind, value: boolean) => {
    if (firstTime) setFresh((s) => ({ ...s, [kind]: value }));
    save(kind, value);
  };
  // A switch can't show ON if the browser blocked it (the hint under the row says how to fix it).
  const isOn = (kind: PermissionKind) => !!switches[kind] && states[kind] !== "denied" && states[kind] !== "unsupported";

  const toggle = (kind: PermissionKind, next: boolean) => {
    setSwitch(kind, next);
    // Flipping ON asks the browser; if it already said yes, the switch just turns on.
    if (next && states[kind] !== "granted") onAllow?.(kind);
  };

  const allOn = ITEMS.every(({ kind }) => isOn(kind) || states[kind] === "unsupported");
  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background text-foreground">
      <header className="relative mt-[59px] flex h-[26px] items-center justify-center">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="absolute left-[13px] flex size-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-foreground"
          >
            <ArrowLeft size={16} aria-hidden />
          </button>
        )}
        <h1 className="text-xl">{firstTime ? "BEFORE YOU GO" : "SETTINGS"}</h1>
      </header>
      <p className="mx-auto mt-3 w-[260px] text-center text-xs leading-relaxed text-foreground/70">
        So the radio works on the road.
      </p>
      <ul className="mx-11 mt-[29px] flex flex-col gap-[17px]">
        {ITEMS.map(({ kind }) => (
          <AccessRow key={kind} kind={kind} state={states[kind]} on={isOn(kind)} onToggle={(next) => toggle(kind, next)} />
        ))}
      </ul>
      <div className="mt-auto flex flex-col items-center gap-2 pb-14 pt-8">
        {firstTime && !allOn && <span className="text-xs text-foreground/70">You can skip and turn them on later.</span>}
        <button
          type="button"
          onClick={onDone}
          data-cuelume-tap=""
          data-cuelume-theme="mech"
          className="inline-flex min-h-[45px] w-[332px] items-center justify-center bg-foreground px-6 text-base text-accent-foreground transition-opacity duration-150 ease-out hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          {firstTime ? (allOn ? "LET'S GO" : "CONTINUE") : "DONE"}
        </button>
      </div>
    </div>
  );
}

/** Allow access, wired to the browser's real permissions. */
export function AllowAccess(props: Omit<AllowAccessViewProps, "states" | "onAllow">) {
  const microphone = usePermission("microphone");
  const notifications = usePermission("notifications");
  const location = usePermission("location");
  const all = { microphone, notifications, location };
  return (
    <AllowAccessView
      {...props}
      states={{ microphone: microphone.state, notifications: notifications.state, location: location.state }}
      onAllow={(kind) => all[kind].ask()}
    />
  );
}
