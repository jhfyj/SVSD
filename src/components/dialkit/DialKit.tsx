"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { signOut, useSession, verifyCode } from "@/lib/auth/session";
import { saveCharacter } from "@/lib/profile/avatar";
import { DEFAULT_CHARACTER } from "@/lib/profile/characters";
import { markOnboarded } from "@/lib/profile/onboarding";
import { setThemeChoice, THEME_KEY, themeChoice, type ThemeChoice } from "@/lib/theme";
import { arrival } from "@/lib/trip/arrival";
import { cn } from "../ui/cn";

/*
  Prototype controls beside the phone column on wide screens: pin the theme, jump to any screen
  or radio state, and arrive at the destination without driving there. Hidden on phone-sized
  screens, so it never shows on a real phone.
*/

const OPEN_KEY = "svsd-dialkit";
const DEMO_PHONE = "5550100100";

const THEMES: ThemeChoice[] = ["auto", "light", "dark"];

const RADIO = [
  { label: "Off", href: "/radio" },
  { label: "Connecting", href: "/radio?call=connecting" },
  { label: "Connected", href: "/radio?call=connected" },
  { label: "Connect, then lost", href: "/radio?call=connecting&outcome=lost" },
  { label: "Connection lost", href: "/radio?call=lost" },
];

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => (e.key === OPEN_KEY || e.key === THEME_KEY) && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
  listeners.forEach((l) => l());
}

export function DialKit() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const session = useSession();
  const open = useSyncExternalStore(subscribe, () => read(OPEN_KEY) !== "closed", () => false);
  const theme = useSyncExternalStore(subscribe, themeChoice, () => "auto" as ThemeChoice);

  const toggle = () => write(OPEN_KEY, open ? "closed" : "open");

  const pickTheme = (choice: ThemeChoice) => {
    // Drop ?theme= so the clock doesn't re-pin the old choice on its next tick.
    if (params.has("theme")) {
      const next = new URLSearchParams(params);
      next.delete("theme");
      router.replace(next.size ? `${path}?${next}` : path);
    }
    setThemeChoice(choice);
    listeners.forEach((l) => l());
  };

  const here = params.size ? `${path}?${params}` : path;

  const flows: { label: string; href: string; go?: () => Promise<void> | void }[] = [
    { label: "Start", href: "/" },
    { label: "Sign in", href: "/profile", go: signOut },
    {
      label: "New account",
      href: "/profile",
      // A fresh number each time, so it goes through Customize profile and Allow access.
      go: async () => {
        await verifyCode(`555${Math.floor(1_000_000 + Math.random() * 8_999_999)}`, "123456");
      },
    },
    {
      label: "Profile",
      href: "/profile",
      go: async () => {
        const phone = session?.phone ?? (await verifyCode(DEMO_PHONE, "123456")).phone;
        saveCharacter(phone, DEFAULT_CHARACTER);
        markOnboarded(phone);
      },
    },
    { label: "Intents", href: "/intents" },
    { label: "Destination", href: "/journey" },
    { label: "Splash", href: "/journey/starting" },
    { label: "Trip recap", href: "/trip" },
  ];

  const go = async (href: string, before?: () => Promise<void> | void) => {
    await before?.();
    router.push(href);
  };

  if (!open) {
    return (
      <div className="fixed left-4 top-4 z-50 hidden lg:block">
        <Chip onClick={toggle}>Dial kit</Chip>
      </div>
    );
  }

  return (
    <aside
      aria-label="Dial kit"
      className="fixed left-4 top-4 z-50 hidden max-h-[calc(100dvh-2rem)] w-[220px] overflow-y-auto border border-border bg-surface p-3 font-mono text-foreground lg:block"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-bold text-label">DIAL KIT</span>
        <button type="button" onClick={toggle} className="text-[11px] text-muted hover:text-foreground">
          HIDE
        </button>
      </div>

      <Group title="Theme">
        <div className="grid grid-cols-3 gap-1">
          {THEMES.map((t) => (
            <Chip key={t} active={theme === t} onClick={() => pickTheme(t)}>
              {t}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title="Flows">
        {flows.map((f) => (
          <Chip
            key={f.label}
            active={!f.go && here === f.href}
            onClick={() => go(f.href, f.go)}
          >
            {f.label}
          </Chip>
        ))}
      </Group>

      <Group title="Radio">
        {RADIO.map((r) => (
          <Chip key={r.label} active={here === r.href} onClick={() => go(r.href)}>
            {r.label}
          </Chip>
        ))}
      </Group>

      <Group title="Destination">
        <Chip
          onClick={() => {
            arrival.arrive();
            if (path !== "/radio") router.push("/radio");
          }}
        >
          Arrive now
        </Chip>
        <Chip onClick={() => arrival.reset()}>Start drive over</Chip>
        <p className="mt-1 text-[10px] leading-snug text-muted">Mocked until Google Maps is in.</p>
      </Group>
    </aside>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-3 last:mb-0">
      <h2 className="mb-1 text-[10px] uppercase text-muted">{title}</h2>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

function Chip({
  active,
  onClick,
  className,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-token border px-2 py-1 text-left text-[11px] uppercase",
        active ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-surface-raised",
        className,
      )}
    >
      {children}
    </button>
  );
}
