"use client";

import { ArrowLeft } from "@carbon/icons-react";
import { PixelIcon } from "./LcdIcon";
import { usePermission, type PermissionKind, type PermissionState } from "@/lib/permissions";
import { cue } from "@/lib/sound";

const ITEMS: { kind: PermissionKind; label: string; why: string; delay: number }[] = [
  { kind: "microphone", label: "MICROPHONE", why: "Talk on the radio and say a word to reply.", delay: 0 },
  { kind: "notifications", label: "NOTIFICATIONS", why: "Know when a message or question comes in.", delay: 400 },
  { kind: "location", label: "LOCATION", why: "Draw your trail and find stories along the way.", delay: 800 },
];

/** What to do when the browser won't ask again. */
const HINT: Partial<Record<PermissionState, Record<PermissionKind, string>>> = {
  denied: {
    microphone: "Blocked. Turn on Microphone for this browser in your phone's Settings, then come back.",
    notifications: "Blocked. Turn on Notifications for this site in your browser's settings.",
    location: "Blocked. Turn on Location for this browser in your phone's Settings, then come back.",
  },
  unsupported: {
    microphone: "This browser can't use the microphone. Try Safari or Chrome.",
    notifications: "On iPhone, add SVSD to your Home Screen first (Share › Add to Home Screen), then turn notifications on.",
    location: "This browser can't share your location.",
  },
};

export type AccessRowProps = {
  kind: PermissionKind;
  state: PermissionState;
  onAllow?: () => void;
};

/** One permission: LCD icon, what it's for, and ALLOW or its current state. */
export function AccessRow({ kind, state, onAllow }: AccessRowProps) {
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
          <span className="text-xs text-foreground/60">{item.why}</span>
        </div>
        {state === "prompt" && (
          <button
            type="button"
            onClick={onAllow}
            data-cuelume-tap=""
            aria-label={`Allow ${item.label.toLowerCase()}`}
            className="min-h-11 shrink-0 border border-foreground px-3 text-xs transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            ALLOW
          </button>
        )}
        {state === "granted" && (
          <span className="flex shrink-0 items-center gap-1.5 text-xs">
            <span aria-hidden className="size-2 rounded-full bg-led shadow-[0_0_6px_var(--led)]" />
            ON
          </span>
        )}
        {state === "denied" && (
          <span className="flex shrink-0 items-center gap-1.5 text-xs">
            <span aria-hidden className="size-2 rounded-full bg-power shadow-[0_0_6px_var(--power)]" />
            OFF
          </span>
        )}
        {state === "unsupported" && (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-foreground/50">
            <span aria-hidden className="size-2 rounded-full border border-current" />
            N/A
          </span>
        )}
        {state === "checking" && <span className="shrink-0 text-xs text-foreground/50">…</span>}
      </div>
      {hint && <p className="text-xs text-foreground/60">{hint}</p>}
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
  const allOn = Object.values(states).every((s) => s === "granted" || s === "unsupported");
  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background text-foreground">
      <header className="relative mt-[59px] flex h-[26px] items-center justify-center">
        {onBack && (
          <button
            type="button"
            onClick={() => {
              cue("navigate", { direction: "back" });
              onBack();
            }}
            aria-label="Back"
            className="absolute left-[13px] flex size-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-foreground"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <h1 className="text-xl">{firstTime ? "BEFORE YOU GO" : "SETTINGS"}</h1>
      </header>
      <p className="mx-auto mt-3 w-[260px] text-center text-xs leading-relaxed text-foreground/60">
        Turn on your microphone, notifications and location so the radio can work on the road.
      </p>
      <ul className="mx-11 mt-[29px] flex flex-col gap-[17px]">
        {ITEMS.map(({ kind }) => (
          <AccessRow key={kind} kind={kind} state={states[kind]} onAllow={() => onAllow?.(kind)} />
        ))}
      </ul>
      <p className="mx-11 mt-4 text-xs text-foreground/50">You can change these anytime in your phone&apos;s Settings.</p>
      <div className="mt-auto flex flex-col items-center gap-2 pb-[33px] pt-8">
        <button
          type="button"
          onClick={onDone}
          data-cuelume-navigate=""
          className="inline-flex min-h-[45px] w-[332px] items-center justify-center bg-foreground px-6 text-base text-accent-foreground transition-opacity hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          {firstTime ? (allOn ? "LET'S GO" : "CONTINUE") : "DONE"}
        </button>
        {firstTime && !allOn && <span className="text-xs text-foreground/50">You can skip and turn them on later.</span>}
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
