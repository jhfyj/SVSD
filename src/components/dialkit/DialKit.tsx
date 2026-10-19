"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { signOut, useSession, verifyCode } from "@/lib/auth/session";
import { saveCharacter } from "@/lib/profile/avatar";
import { DEFAULT_CHARACTER } from "@/lib/profile/characters";
import { markOnboarded } from "@/lib/profile/onboarding";
import { clearHangUps } from "@/lib/radio/hangups";
import { AMBER_KEY, amberOn, setAmber, setThemeChoice, THEME_KEY, themeChoice, type ThemeChoice } from "@/lib/theme";
import { arrival } from "@/lib/trip/arrival";
import { setSoundOn, useSoundOn } from "@/lib/sound";
import { cn } from "../ui/cn";
import { useTwoFingerHold } from "./useTwoFingerHold";

/*
  Prototype controls beside the phone column on wide screens: pin the theme and jump to any moment
  of the demo video. Flows follow the video script in order, so each prototype shot is one click
  away. Screens that aren't built yet (NEW) open a blank stand-in; ones that differ from the script
  (CHANGE) carry a note, so the kit doubles as the build list. TO-DOS hides the notes for recording.
  Hidden on phone-sized screens, so it never shows on a real phone.

  The hosted site (the production build on Vercel, filmed on a phone) never shows the panel at all:
  the only control is the flow picker, six keys along the bottom that appear when you hold two
  fingers on the screen (or press ` on a keyboard). Locally (next dev) the panel stays as it was.
*/

/** The side panel: only while working locally. The hosted site shows nothing but the hidden picker. */
const PANEL = process.env.NODE_ENV !== "production";

const OPEN_KEY = "svsd-dialkit";
const TODOS_KEY = "svsd-dialkit-todos";
const DEMO_PHONE = "5550100100";

const THEMES: ThemeChoice[] = ["auto", "light", "dark"];

/** The Hang-up timeout flow: a call in progress, with hang-ups counting. */
const TIMEOUT_HREF = "/radio?call=connected&timeout=on";
const TIMEOUT_SKIP_HREF = "/radio?call=connecting&timeout=on";

type Step = {
  label: string;
  /** Where the step lives. Unbuilt screens point at blank(); steps with neither href nor go are notes. */
  href?: string;
  /** Runs before going to href, or on its own when there's no href. */
  go?: () => Promise<void> | void;
  /** A radio state: the drive starts over first, so it shows the usual console, not End trip. */
  radio?: boolean;
  /** NEW: not built yet. CHANGE: built, but differs from the script. */
  todo?: "new" | "change";
  note?: string;
  /** Points at a step in another flow, so it isn't counted twice. */
  repeat?: boolean;
  /** When the step is showing, for steps that don't have a fixed href to compare. */
  active?: boolean;
};

type Flow = {
  /** Order in the video; empty for groups outside the script. */
  n: string;
  title: string;
  time?: string;
  note?: string;
  /** Where the flow's key at the bottom of the kit starts it (default: its first step). */
  start?: () => void;
  steps: Step[];
};

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => (e.key === OPEN_KEY || e.key === TODOS_KEY || e.key === THEME_KEY || e.key === AMBER_KEY) && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The radio with a fresh ?load=, so its load-in plays again. */
const loadIn = () => `/radio?load=${Date.now()}`;
/** The scripted story drive, from the start each time. */
const storyDrive = () => {
  const run = Date.now();
  return `/radio?demo=story&load=${run}&t=${run}`;
};

/** Night mode from one of its moments, from the start each time, driving the demo route. */
/** Flow 5: the last stretch into the destination (a new t= starts it over). */
const arriveDrive = () => `/radio?demo=arrive&t=${Date.now()}`;
const nightDrive = (start: "fall" | "checkin" | "rest") => `/radio?night=${start}&sim&t=${Date.now()}`;

/** The stand-in for a screen that isn't built yet. */
const blank = (screen: string) => `/blank?${new URLSearchParams({ screen })}`;

/** A fresh number each time, so it goes through Customize profile and Allow access. */
async function newAccount() {
  await verifyCode(`555${Math.floor(1_000_000 + Math.random() * 8_999_999)}`, "123456");
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
  const showTodos = useSyncExternalStore(subscribe, () => read(TODOS_KEY) !== "hidden", () => true);
  const theme = useSyncExternalStore(subscribe, themeChoice, () => "auto" as ThemeChoice);
  const amber = useSyncExternalStore(subscribe, amberOn, () => false);

  // The flow picker: two fingers held on the screen (or ` on a keyboard) shows it, again hides it.
  const [picking, setPicking] = useState(false);
  const togglePicker = useCallback(() => setPicking((p) => !p), []);
  useTwoFingerHold(togglePicker);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable]");
      if (e.key === "`" && !typing) togglePicker();
      if (e.key === "Escape") setPicking(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePicker]);

  const toggle = () => write(OPEN_KEY, open ? "closed" : "open");
  const toggleTodos = () => write(TODOS_KEY, showTodos ? "hidden" : "shown");

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

  /** Night mode's amber radio, off by default (see lib/theme). */
  const pickAmber = (on: boolean) => {
    if (params.has("amber")) {
      const next = new URLSearchParams(params);
      next.delete("amber");
      router.replace(next.size ? `${path}?${next}` : path);
    }
    setAmber(on);
    listeners.forEach((l) => l());
  };

  const here = params.size ? `${path}?${params}` : path;

  const signedIn = async () => {
    const phone = session?.phone ?? (await verifyCode(DEMO_PHONE, "123456")).phone;
    saveCharacter(phone, DEFAULT_CHARACTER);
    markOnboarded(phone);
  };
  // Already on the radio: change the URL in the browser (Next keeps useSearchParams in step) so it
  // starts over at once, without a round trip for the same page.
  const openRadio = (href: string) => (path === "/radio" ? window.history.pushState(null, "", href) : router.push(href));
  // ?arrived opens the radio mid-drive (already started), so it can reach the destination.
  const arrive = () => {
    arrival.arrive();
    openRadio("/radio?arrived=1");
  };

  const flows: Flow[] = [
    {
      n: "1",
      title: "Intro to Caravan",
      time: "0:50",
      // Jen's order: the radio tunes in (loading), the three overview cards, sign in with your
      // number, pick an avatar, then home.
      start: () => {
        signOut();
        router.push("/welcome");
      },
      steps: [
        {
          label: "Tuning in · loading",
          href: "/welcome",
          note: "The caravan crosses the road, then hands over to Overview 1. Tap to skip.",
        },
        {
          label: "Overview 1 · Stories",
          href: "/overview?step=1",
          note: "“Listen and plant stories and questions along your road.”",
        },
        {
          label: "Overview 2 · Company",
          href: "/overview?step=2",
          note: "“Flip on Company to talk to a real stranger with the same mood and distance as you.”",
        },
        {
          label: "Overview 3 · Anonymous",
          href: "/overview?step=3",
          note: "“Pick a handle and avatar to stay anonymous.” NEXT goes to sign in.",
        },
        { label: "Sign in with number", href: "/profile?welcome=1", go: signOut },
        {
          label: "Roadside avatar",
          href: "/profile?welcome=1",
          go: newAccount,
          todo: "change",
          note: "Save goes straight to Start your journey. Add picking a handle (card 3 promises one).",
        },
        { label: "Start your journey", href: "/" },
      ],
    },
    {
      n: "2",
      title: "Stories on the road",
      time: "1:05",
      steps: [
        { label: "Pick a destination", href: "/" },
        {
          label: "Splash · connecting to radio",
          href: "/journey/starting",
          note: "Start journey on Destination plays it, then the radio loads in with the story drive.",
        },
        {
          label: "Radio loads in",
          // Restarts at once when already on the radio (see openRadio).
          go: () => openRadio(loadIn()),
          radio: true,
          active: path === "/radio" && params.has("load"),
          note: "The blueprint load-in: the start of every journey, for everyone. Plays again on every click.",
        },
        {
          label: "Tracking the road",
          href: "/radio?sim",
          radio: true,
          todo: "change",
          note: "Needs a scripted LA route (I-10) that drives without location, so the map tracks the road on camera.",
        },
        {
          label: "Message unlocks · 3D story",
          go: () => openRadio(storyDrive()),
          radio: true,
          active: path === "/radio" && params.get("demo") === "story",
          note: "The radio load-in plays first, then the car waits three seconds and drives for about three seconds. A story pulls in, the pixel trail lingers, then @NightOwl's story plays with a spoken reply prompt.",
        },
        {
          label: "Message unlocks · Angelina's",
          href: "/radio?message=message",
          radio: true,
          todo: "change",
          note: "Built (Angelina): static, then the station locks, the map glows in the message's color. Plays a sample from @Hufflepuff23; the script's @NightOwl unlock isn't recorded yet.",
        },
        {
          label: "@NightOwl's voice message",
          go: () => (path === "/radio" ? window.history.pushState(null, "", storyDrive()) : router.push(storyDrive())),
          radio: true,
          note: "The story unlock demo above includes @NightOwl's breakfast burrito message and reply prompt.",
        },
        {
          label: "Reply?",
          go: () => (path === "/radio" ? window.history.pushState(null, "", storyDrive()) : router.push(storyDrive())),
          radio: true,
          todo: "change",
          note: "After the message, the recorded radio voice asks whether you want to reply. RESPOND is yes; skip or a few quiet seconds is no.",
        },
      ],
    },
    {
      n: "3",
      title: "Company: one stranger",
      time: "1:45",
      steps: [
        {
          label: "Company · one stranger",
          href: "/radio?demo=company",
          radio: true,
          note: "Starts on a moving navigation map. Turn the radio on and choose Off my chest to meet Mothlight; their conversation plays from NightOwl’s perspective.",
        },
        {
          label: "Mood: pick an intent",
          href: "/radio?demo=company&call=pick",
          radio: true,
          note: "Choose Off my chest to connect with Mothlight.",
        },
        { label: "Connecting", href: "/radio?demo=company&call=connecting", radio: true },
        {
          label: "Meet @Mothlight",
          href: "/radio?demo=company&call=connected",
          radio: true,
          note: "The recorded radio voice introduces @NightOwl and @Mothlight; the LCD turns to “To start” as it asks where they’re headed. Mothlight’s rabbit appears on the green LCD.",
        },
        {
          label: "@Mothlight speaking",
          href: "/radio?demo=company&call=connected",
          radio: true,
          note: "Mothlight speaks first; their rabbit avatar and the dithered map glow animate in the clipped strip at the map’s top.",
        },
        {
          label: "NightOwl answers back",
          href: "/radio?demo=company&call=connected",
          radio: true,
          note: "The speaker treatment switches to NightOwl, then back to Mothlight, without covering the route.",
        },
      ],
    },
    {
      n: "4",
      title: "Answer a question",
      time: "2:30",
      steps: [
        {
          label: "Question unlocks",
          href: "/radio?demo=question",
          radio: true,
          note: "Start already driving. A 3D question mark pulls into the radio; the radio says You just unlocked a question from NightOwl. Would you like to respond? The question stays hidden until you say yes.",
        },
        {
          label: "Answering",
          href: "/radio?demo=question",
          radio: true,
          note: "The mic opens by itself (your green from the bottom). Say yes (or tap Respond): the question shows on the LCD while NightOwl’s pink comes down from the top (silent until there's a recording). Then the beep, YOUR REPLY, your green from the bottom; SEND or 10 s of quiet sends it, then back to the usual screen.",
        },
        {
          label: "Planting your answer",
          href: "/radio?messages=off&sim",
          radio: true,
          note: "Built as Drop (Jen): planting your own thing, radio off, nothing coming in, the map driving the route. Tap the pin key, talk, tap send. It's sorted into a message or a question and pinned on the map where you are. No pin key on a call.",
        },
      ],
    },
    {
      n: "5",
      title: "Your drive becomes a story",
      time: "3:20",
      steps: [
        {
          label: "Arriving",
          go: () => openRadio(arriveDrive()),
          radio: true,
          note: "The last stretch of the drive: the map pulls up at the destination pin, then the radio switches on and says Thank you so much for riding with us.",
        },
        { label: "Arrive now", go: arrive },
        {
          label: "Trip recap",
          href: "/trip",
          todo: "change",
          note: "Route draws in. Copy: 31 STORIES FROM 9 STATES · 84 MILES WITH @NightOwl.",
        },
        {
          label: "Notifications",
          href: blank("Notifications"),
          todo: "new",
          note: "Who listened to your message and who answered your question: “@urmom6767 answered your question · 900 miles away.”",
        },
        {
          label: "Their answer plays",
          href: blank("Their answer plays"),
          todo: "new",
          note: "The full-circle moment: Priya's answer plays back.",
        },
        { label: "Start drive over", go: () => arrival.reset() },
      ],
    },
    {
      n: "6",
      title: "Night mode",
      note: "Plays by itself, nothing to tap: sunset, NIGHT MODE ON, the check-in, a slow answer, then the rest area. Each step starts there.",
      steps: [
        {
          label: "Night falls",
          // Starts by day: the sunset pins the night theme (and turns the radio amber if Night amber is on).
          go: () => {
            pickTheme("light");
            openRadio(nightDrive("fall"));
          },
          radio: true,
          active: path === "/radio" && params.get("night") === "fall",
          note: "The sun sinks across the map, the light dims, the radio flickers back on: NIGHT MODE ON, then 214 driving tonight. Amber only if Night amber is on.",
        },
        {
          label: "Check-in",
          go: () => {
            pickTheme("dark");
            openRadio(nightDrive("checkin"));
          },
          radio: true,
          active: path === "/radio" && params.get("night") === "checkin",
          note: "“Still with me? Tell me one thing you can see.” Listening; no answer comes, so NOTHING HEARD, then it reroutes to the rest area by itself.",
        },
        {
          label: "Rest area",
          go: () => {
            pickTheme("dark");
            openRadio(nightDrive("rest"));
          },
          radio: true,
          active: path === "/radio" && params.get("night") === "rest",
          note: "Rerouting to the rest area by itself; stories keep coming. Exit (the X key, where Drop sits) drops the reroute and carries on along your route; Settings stays. 7 s later you're parked: the dot stops on the map until Back on the road, then the drive picks up again.",
        },
        { label: "Amber cockpit", href: "/radio?sim", radio: true, go: () => { pickTheme("dark"); pickAmber(true); }, note: "Turns the Night amber switch on: any radio state at night goes amber. Switch it off under Night amber." },
      ],
    },
    {
      n: "",
      title: "Every flow",
      steps: [
        { label: "Demo handles", todo: "change", note: "Script: @NightOwl, @Mothlight, @urmom6767. Sample data has @Nightowl88, @Urmom2424." },
        { label: "Name: Caravan", todo: "change", note: "Page titles and copy still say SVSD." },
      ],
    },
    {
      n: "",
      title: "Not in the script",
      steps: [
        { label: "Profile", href: "/profile", go: signedIn },
        { label: "Connect, then lost", href: "/radio?call=connecting&outcome=lost", radio: true },
        { label: "Connection lost", href: "/radio?call=lost", radio: true },
      ],
    },
    {
      n: "",
      title: "Hang-up timeout",
      note: "3 hang-ups in a minute = a 20 s break here (5 min in the real rule). Every other flow ignores hang-ups.",
      steps: [
        // Start clean on a call, then hang up 3 times to see it.
        { label: "Try it", href: TIMEOUT_HREF, radio: true, go: clearHangUps },
        // Clears the count and the break, then reopens the radio (a new address so it starts over).
        { label: "Skip the wait", href: here === TIMEOUT_HREF ? TIMEOUT_SKIP_HREF : TIMEOUT_HREF, go: clearHangUps },
      ],
    },
  ];

  const counted = flows.flatMap((f) => f.steps).filter((s) => !s.repeat);
  const newCount = counted.filter((s) => s.todo === "new").length;
  const changeCount = counted.filter((s) => s.todo === "change").length;

  const run = async (step: Step) => {
    if (step.radio) arrival.reset();
    await step.go?.();
    if (step.href) router.push(step.href);
  };

  // The six flows, one key each at the bottom of the kit. A key opens the flow's first screen and
  // the app itself carries you through the rest (NEXT, Save, Start journey...): nothing plays on a
  // timer. Flow 1 signs out first so it runs as a new person would see it.
  const numbered = flows.filter((f) => f.n);
  // Every flow is for filming, so starting one always turns the sound back on (the mute is
  // remembered per device, and the hosted site has no panel to see it on).
  const soundOn = useSoundOn();
  const startFlow = (f: Flow) => {
    setSoundOn(true);
    return f.start ? f.start() : void run(f.steps[0]);
  };

  const playBar = (
    <div className="sticky bottom-0 -mx-3 -mb-3 mt-4 border-t border-border bg-surface p-3">
      <h2 className="mb-1 text-xs uppercase text-foreground/70">Start a flow</h2>
      <div className="grid grid-cols-6 gap-1">
        {numbered.map((f) => (
          <Chip key={f.n} onClick={() => startFlow(f)} className="text-center" title={`${f.n} · ${f.title}`}>
            {f.n}
          </Chip>
        ))}
      </div>
    </div>
  );

  const picker = picking && (
    <FlowPicker
      flows={numbered}
      onPick={(f) => {
        setPicking(false);
        startFlow(f);
      }}
      onClose={() => setPicking(false)}
    />
  );

  // The hosted site: nothing on screen until two fingers are held down.
  if (!PANEL) return picker;

  if (!open) {
    return (
      <>
        {picker}
        <div className="fixed left-4 top-4 z-50 hidden lg:block">
          <Chip onClick={toggle}>Dial kit</Chip>
        </div>
      </>
    );
  }

  return (
    <>
    {picker}
    <aside
      aria-label="Dial kit"
      className="fixed left-4 top-4 z-50 hidden max-h-[calc(100dvh-2rem)] w-[260px] overflow-y-auto border border-border bg-surface p-3 font-mono text-foreground lg:block"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold text-label">DIAL KIT</span>
        <button type="button" onClick={toggle} className="text-xs text-foreground/70 hover:text-foreground">
          HIDE
        </button>
      </div>

      <Group title="Sound">
        <div className="grid grid-cols-2 gap-1">
          <Chip active={!soundOn} onClick={() => setSoundOn(false)}>
            off
          </Chip>
          <Chip active={soundOn} onClick={() => setSoundOn(true)}>
            on
          </Chip>
        </div>
      </Group>
      <Group title="Theme">
        <div className="grid grid-cols-3 gap-1">
          {THEMES.map((t) => (
            <Chip key={t} active={theme === t} onClick={() => pickTheme(t)}>
              {t}
            </Chip>
          ))}
        </div>
      </Group>
      <Group title="Night amber">
        <div className="grid grid-cols-2 gap-1">
          <Chip active={!amber} onClick={() => pickAmber(false)}>
            off
          </Chip>
          <Chip active={amber} onClick={() => pickAmber(true)}>
            on
          </Chip>
        </div>
      </Group>

      <div className="mb-4 flex items-center justify-between gap-2 border-y border-border py-2">
        <span className="text-xs text-foreground/70">
          {newCount} NEW · {changeCount} CHANGE
        </span>
        <Chip active={showTodos} onClick={toggleTodos}>
          To-dos
        </Chip>
      </div>

      {flows.map((flow) => {
        const steps = showTodos ? flow.steps : flow.steps.filter((s) => s.href || s.go);
        if (!steps.length) return null;
        return (
          <Group key={`${flow.n}-${flow.title}`} title={flow.n ? `${flow.n} · ${flow.title}` : flow.title} time={flow.time}>
            {showTodos && flow.note && <p className="text-xs text-foreground/70">{flow.note}</p>}
            {steps.map((step) => (
              <StepRow
                key={step.label}
                step={step}
                showTodos={showTodos}
                active={step.active ?? (!!step.href && !step.go && here === step.href)}
                onClick={() => run(step)}
              />
            ))}
          </Group>
        );
      })}

      {playBar}
    </aside>
    </>
  );
}

/**
 * The six flows along the bottom of the screen, over whatever's showing: the only prototype control
 * on the hosted site, and only after a two-finger hold. Tap a number to start that flow from its
 * first screen (the app's own keys carry you on from there); tap anywhere else to hide it.
 */
export function FlowPicker<F extends Pick<Flow, "n" | "title">>({
  flows,
  onPick,
  onClose,
}: {
  flows: F[];
  onPick: (f: F) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] font-mono text-foreground" role="dialog" aria-label="Start a flow">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[393px] border-t border-border bg-surface px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <h2 className="mb-2 text-xs uppercase text-foreground/70">Start a flow</h2>
        <div className="grid grid-cols-6 gap-1.5">
          {flows.map((f) => (
            <Chip key={f.n} onClick={() => onPick(f)} className="h-12 text-center! text-base!" title={`${f.n} · ${f.title}`}>
              {f.n}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepRow({ step, showTodos, active, onClick }: { step: Step; showTodos: boolean; active: boolean; onClick: () => void }) {
  const clickable = !!(step.href || step.go);
  const tag = showTodos && step.todo && <Tag>{step.todo}</Tag>;
  return (
    <div>
      {clickable ? (
        <Chip
          active={active}
          onClick={onClick}
          // Unbuilt screens open the blank stand-in; the dashed edge says so at a glance.
          className={cn("flex w-full items-center justify-between gap-2", step.todo === "new" && "border-dashed")}
        >
          <span>{step.label}</span>
          {tag}
        </Chip>
      ) : (
        <div className="flex items-center justify-between gap-2 border border-dashed border-border px-2 py-1 text-xs uppercase text-foreground/70">
          <span>{step.label}</span>
          {tag}
        </div>
      )}
      {showTodos && step.note && <p className="mt-0.5 mb-1 text-xs leading-snug text-foreground/70">{step.note}</p>}
    </div>
  );
}

function Group({ title, time, children }: { title: string; time?: string; children: ReactNode }) {
  return (
    <section className="mb-4 last:mb-0">
      <h2 className="mb-1 flex items-baseline justify-between text-xs uppercase text-foreground/70">
        <span>{title}</span>
        {time && <span className="tabular-nums">{time}</span>}
      </h2>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="shrink-0 border border-current px-1 text-xs uppercase leading-4">{children}</span>;
}

function Chip({
  active,
  onClick,
  className,
  title,
  disabled,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  className?: string;
  title?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "rounded-token border px-2 py-1 text-left text-xs uppercase transition-colors duration-150 ease-out",
        active ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-surface-raised",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}
