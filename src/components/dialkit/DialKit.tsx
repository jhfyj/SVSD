"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { signOut, useSession, verifyCode } from "@/lib/auth/session";
import { saveCharacter } from "@/lib/profile/avatar";
import { DEFAULT_CHARACTER } from "@/lib/profile/characters";
import { markOnboarded } from "@/lib/profile/onboarding";
import { clearHangUps } from "@/lib/radio/hangups";
import { AMBER_KEY, amberOn, setAmber, setThemeChoice, THEME_KEY, themeChoice, type ThemeChoice } from "@/lib/theme";
import { arrival } from "@/lib/trip/arrival";
import { cn } from "../ui/cn";

/*
  Prototype controls beside the phone column on wide screens: pin the theme and jump to any moment
  of the demo video. Flows follow the video script in order, so each prototype shot is one click
  away. Screens that aren't built yet (NEW) open a blank stand-in; ones that differ from the script
  (CHANGE) carry a note, so the kit doubles as the build list. TO-DOS hides the notes for recording.
  Hidden on phone-sized screens, so it never shows on a real phone.
*/

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
  /** Play a flow: seconds to hold on this step before the next one (default PLAY_HOLD). */
  hold?: number;
  /** Play a flow: false leaves it out (a duplicate of an earlier step, a reset or a switch). */
  play?: false;
};

/** Play a flow: how long a step holds when it doesn't say. */
const PLAY_HOLD = 5;

/** The steps Play a flow walks through: everything you can open, minus the ones marked play: false. */
const playable = (flow: Flow) => flow.steps.filter((s) => (s.href || s.go) && s.play !== false);

type Player = { flow: number; step: number; paused: boolean; at: number };

type Flow = { /** Order in the video; empty for groups outside the script. */ n: string; title: string; time?: string; note?: string; steps: Step[] };

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
      steps: [
        { label: "Sign in with number", href: "/profile", go: signOut, hold: 4 },
        {
          label: "Roadside avatar",
          hold: 4,
          href: "/profile",
          go: newAccount,
          todo: "change",
          note: "Customize profile picks a character; add picking a handle (card 3 promises one).",
        },
        {
          label: "Overview 1 · Stories",
          hold: 4,
          href: "/overview?step=1",
          note: "“Listen and plant stories and questions along your road.”",
        },
        {
          label: "Overview 2 · Company",
          hold: 4,
          href: "/overview?step=2",
          note: "“Flip on Company to talk to a real stranger with the same mood and distance as you.”",
        },
        {
          label: "Overview 3 · Anonymous",
          hold: 4,
          href: "/overview?step=3",
          note: "“Pick a handle and avatar to stay anonymous.”",
        },
        {
          label: "Splash · connecting to radio",
          hold: 5,
          href: "/journey/starting",
          todo: "change",
          note: "Today the splash opens the radio; here it comes before Start your journey.",
        },
        { label: "Start your journey", href: "/", hold: 5 },
      ],
    },
    {
      n: "2",
      title: "Stories on the road",
      time: "1:05",
      steps: [
        { label: "Destination", href: "/journey", hold: 6 },
        {
          label: "Radio loads in",
          hold: 6,
          // Restarts at once when already on the radio (see openRadio).
          go: () => openRadio(loadIn()),
          radio: true,
          active: path === "/radio" && params.has("load"),
          note: "The blueprint load-in: the start of every journey, for everyone. Plays again on every click.",
        },
        {
          label: "Tracking the road",
          hold: 8,
          href: "/radio?sim",
          radio: true,
          todo: "change",
          note: "Needs a scripted LA route (I-10) that drives without location, so the map tracks the road on camera.",
        },
        {
          label: "Message unlocks · 3D story",
          hold: 32,
          go: () => openRadio(storyDrive()),
          radio: true,
          active: path === "/radio" && params.get("demo") === "story",
          note: "The radio load-in plays first, then the car waits three seconds and drives for about three seconds. A story pulls in, the pixel trail lingers, then @NightOwl's story plays with a spoken reply prompt.",
        },
        {
          label: "Message unlocks · Angelina's",
          hold: 18,
          href: "/radio?message=message",
          radio: true,
          todo: "change",
          note: "Built (Angelina): static, then the station locks, the map glows in the message's color. Plays a sample from @Hufflepuff23; the script's @NightOwl unlock isn't recorded yet.",
        },
        {
          label: "@NightOwl's voice message",
          // Played inside Message unlocks · 3D story.
          play: false,
          go: () => (path === "/radio" ? window.history.pushState(null, "", storyDrive()) : router.push(storyDrive())),
          radio: true,
          note: "The story unlock demo above includes @NightOwl's breakfast burrito message and reply prompt.",
        },
        {
          label: "Reply?",
          // Played inside Message unlocks · 3D story.
          play: false,
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
          hold: 6,
          href: "/radio?demo=company",
          radio: true,
          note: "Starts on a moving navigation map. Turn the radio on and choose Off my chest to meet Mothlight; their conversation plays from NightOwl’s perspective.",
        },
        {
          label: "Mood: pick an intent",
          hold: 5,
          href: "/radio?demo=company&call=pick",
          radio: true,
          note: "Choose Off my chest to connect with Mothlight.",
        },
        { label: "Connecting", href: "/radio?demo=company&call=connecting", radio: true, hold: 4 },
        {
          label: "Meet @Mothlight",
          hold: 10,
          href: "/radio?demo=company&call=connected",
          radio: true,
          note: "The recorded radio voice introduces @NightOwl and @Mothlight; the LCD turns to “To start” as it asks where they’re headed. Mothlight’s rabbit appears on the green LCD.",
        },
        {
          label: "@Mothlight speaking",
          hold: 10,
          href: "/radio?demo=company&call=connected",
          radio: true,
          note: "Mothlight speaks first; their rabbit avatar and the dithered map glow animate in the clipped strip at the map’s top.",
        },
        {
          label: "NightOwl answers back",
          hold: 12,
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
          hold: 12,
          href: "/radio?demo=question",
          radio: true,
          note: "Start already driving. A 3D question mark pulls into the radio with the story-unlock animation; the AI announces the unlock and shows NightOwl’s question.",
        },
        {
          label: "Answering",
          hold: 10,
          href: "/radio?demo=question",
          radio: true,
          note: "Press Reply to play @urmom6767’s answer as a visual voice animation for about eight seconds. No spoken answer audio.",
        },
        {
          label: "Planting your answer",
          hold: 10,
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
        { label: "Arrive now", go: arrive, hold: 7 },
        {
          label: "Trip recap",
          hold: 8,
          href: "/trip",
          todo: "change",
          note: "Route draws in. Copy: 31 STORIES FROM 9 STATES · 84 MILES WITH @NightOwl.",
        },
        {
          label: "Notifications",
          hold: 4,
          href: blank("Notifications"),
          todo: "new",
          note: "Who listened to your message and who answered your question: “@urmom6767 answered your question · 900 miles away.”",
        },
        {
          label: "Their answer plays",
          hold: 4,
          href: blank("Their answer plays"),
          todo: "new",
          note: "The full-circle moment: Priya's answer plays back.",
        },
        { label: "Start drive over", go: () => arrival.reset(), play: false },
      ],
    },
    {
      n: "6",
      title: "Night mode",
      note: "Plays by itself, nothing to tap: sunset, NIGHT MODE ON, the check-in, a slow answer, then the rest area. Each step starts there.",
      steps: [
        {
          label: "Night falls",
          hold: 13,
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
          hold: 12,
          go: () => {
            pickTheme("dark");
            openRadio(nightDrive("checkin"));
          },
          radio: true,
          active: path === "/radio" && params.get("night") === "checkin",
          note: "“Still with me? Tell me one thing you can see.” Listening; Jay's slow answer rises from the bottom of the map.",
        },
        {
          label: "Rest area",
          hold: 15,
          go: () => {
            pickTheme("dark");
            openRadio(nightDrive("rest"));
          },
          radio: true,
          active: path === "/radio" && params.get("night") === "rest",
          note: "REST AREA 9 MI takes over the map; stories paused until you're back. Route to rest area folds the sign to a strip; 7 s later you're parked: Back on the road brings stories back.",
        },
        { label: "Amber cockpit", play: false, href: "/radio?sim", radio: true, go: () => { pickTheme("dark"); pickAmber(true); }, note: "Turns the Night amber switch on: any radio state at night goes amber. Switch it off under Night amber." },
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

  // Play a flow: one key per numbered flow at the bottom of the kit. It opens each step in order
  // and holds it (step.hold seconds), so a whole flow plays from one press. Back / Next step by
  // hand, Pause holds where you are, Stop ends it. Steps that share the previous step's address
  // (the call keeps going) don't reopen it; the player just holds there.
  const numbered = flows.map((f, i) => ({ f, i })).filter(({ f }) => f.n);
  const [player, setPlayer] = useState<Player | null>(null);
  const playing = player ? playable(flows[player.flow]) : [];
  const current = player ? playing[player.step] : undefined;
  const holdMs = (current?.hold ?? PLAY_HOLD) * 1000;
  const playStep = (flow: number, step: number, paused = false) => {
    const steps = playable(flows[flow]);
    const s = steps[step];
    if (!s) return setPlayer(null);
    const prev = steps[step - 1];
    if (!(prev && !s.go && s.href && s.href === prev.href)) void run(s);
    setPlayer({ flow, step, paused, at: Date.now() });
  };
  // The latest playStep, for the timer below (it's a new function every render).
  const nextStep = useRef<() => void>(() => {});
  useEffect(() => {
    nextStep.current = () => player && playStep(player.flow, player.step + 1);
  });
  useEffect(() => {
    if (!player || player.paused) return;
    const t = setTimeout(() => nextStep.current(), holdMs);
    return () => clearTimeout(t);
  }, [player, holdMs]);

  const playBar = (
    <div className="sticky bottom-0 -mx-3 -mb-3 mt-4 border-t border-border bg-surface p-3">
      <h2 className="mb-1 text-xs uppercase text-foreground/70">Play a flow</h2>
      <div className="grid grid-cols-6 gap-1">
        {numbered.map(({ f, i }) => (
          <Chip
            key={f.n}
            active={player?.flow === i}
            onClick={() => (player?.flow === i ? setPlayer(null) : playStep(i, 0))}
            className="text-center"
            title={`${f.n} · ${f.title}`}
          >
            {f.n}
          </Chip>
        ))}
      </div>
      {player && current && (
        <div className="mt-2">
          <p className="text-xs uppercase text-foreground/70">
            {flows[player.flow].n} · {flows[player.flow].title}
          </p>
          <p className="mt-0.5 flex items-baseline justify-between gap-2 text-xs uppercase">
            <span className="truncate">{current.label}</span>
            <span className="shrink-0 tabular-nums text-foreground/70">
              {player.step + 1}/{playing.length}
            </span>
          </p>
          {/* How long until the next step; it stops while paused. */}
          <div className="mt-1 h-0.5 bg-border">
            <PlayProgress key={player.at} ms={holdMs} paused={player.paused} />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1">
            <Chip onClick={() => playStep(player.flow, player.step - 1)} disabled={player.step === 0} className="text-center">
              Back
            </Chip>
            <Chip onClick={() => setPlayer({ ...player, paused: !player.paused, at: Date.now() })} active={player.paused} className="text-center">
              {player.paused ? "Play" : "Pause"}
            </Chip>
            <Chip onClick={() => playStep(player.flow, player.step + 1)} className="text-center">
              {player.step + 1 === playing.length ? "Done" : "Next"}
            </Chip>
            <Chip onClick={() => setPlayer(null)} className="text-center">
              Stop
            </Chip>
          </div>
        </div>
      )}
    </div>
  );

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
      className="fixed left-4 top-4 z-50 hidden max-h-[calc(100dvh-2rem)] w-[260px] overflow-y-auto border border-border bg-surface p-3 font-mono text-foreground lg:block"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold text-label">DIAL KIT</span>
        <button type="button" onClick={toggle} className="text-xs text-foreground/70 hover:text-foreground">
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
                active={current ? step === current : (step.active ?? (!!step.href && !step.go && here === step.href))}
                onClick={() => run(step)}
              />
            ))}
          </Group>
        );
      })}

      {playBar}
    </aside>
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

/** The thin bar under the step being played: fills over the step's hold, holds still while paused. */
function PlayProgress({ ms, paused }: { ms: number; paused: boolean }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (paused || !bar.current) return;
    const a = bar.current.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: ms, easing: "linear", fill: "forwards" });
    return () => a.cancel();
  }, [ms, paused]);
  return <div ref={bar} className="h-full origin-left scale-x-0 bg-foreground" />;
}
