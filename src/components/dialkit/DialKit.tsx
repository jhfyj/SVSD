"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { signOut, useSession, verifyCode } from "@/lib/auth/session";
import { saveCharacter } from "@/lib/profile/avatar";
import { DEFAULT_CHARACTER } from "@/lib/profile/characters";
import { markOnboarded } from "@/lib/profile/onboarding";
import { clearHangUps } from "@/lib/radio/hangups";
import { setThemeChoice, THEME_KEY, themeChoice, type ThemeChoice } from "@/lib/theme";
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
};

type Flow = { /** Order in the video; empty for groups outside the script. */ n: string; title: string; time?: string; note?: string; steps: Step[] };

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => (e.key === OPEN_KEY || e.key === TODOS_KEY || e.key === THEME_KEY) && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The radio with a fresh ?load=, so its load-in plays again. */
const loadIn = () => `/radio?load=${Date.now()}`;

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

  const here = params.size ? `${path}?${params}` : path;

  const signedIn = async () => {
    const phone = session?.phone ?? (await verifyCode(DEMO_PHONE, "123456")).phone;
    saveCharacter(phone, DEFAULT_CHARACTER);
    markOnboarded(phone);
  };
  const arrive = () => {
    arrival.arrive();
    if (path !== "/radio") router.push("/radio");
  };

  const flows: Flow[] = [
    {
      n: "1",
      title: "Intro to Caravan",
      time: "0:50",
      steps: [
        { label: "Sign in with number", href: "/profile", go: signOut },
        {
          label: "Roadside avatar",
          href: "/profile",
          go: newAccount,
          todo: "change",
          note: "Customize profile picks a character; add picking a handle (card 3 promises one).",
        },
        {
          label: "Overview 1 · Stories",
          href: blank("Overview 1 · Stories"),
          todo: "new",
          note: "“Listen and plant stories and questions along your road.”",
        },
        {
          label: "Overview 2 · Company",
          href: blank("Overview 2 · Company"),
          todo: "new",
          note: "“Flip on Company to talk to a real stranger with the same mood and distance as you.”",
        },
        {
          label: "Overview 3 · Anonymous",
          href: blank("Overview 3 · Anonymous"),
          todo: "new",
          note: "“Pick a handle and avatar to stay anonymous.”",
        },
        {
          label: "Splash · connecting to radio",
          href: "/journey/starting",
          todo: "change",
          note: "Today the splash opens the radio; here it comes before Start your journey.",
        },
        { label: "Start your journey", href: "/" },
      ],
    },
    {
      n: "2",
      title: "Stories on the road",
      time: "1:05",
      steps: [
        { label: "Destination", href: "/journey" },
        {
          label: "Radio loads in",
          // Already on the radio: change the URL in the browser (Next keeps useSearchParams in step)
          // so the load-in restarts at once, without a round trip for the same page.
          go: () => (path === "/radio" ? window.history.pushState(null, "", loadIn()) : router.push(loadIn())),
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
          label: "Message unlocks",
          href: "/radio?message=message",
          radio: true,
          todo: "change",
          note: "Built (Angelina): static, then the station locks, the map glows in the message's color. Plays a sample from @Hufflepuff23; the script's @NightOwl unlock isn't recorded yet.",
        },
        {
          label: "@NightOwl's voice message",
          href: blank("@NightOwl's voice message"),
          todo: "new",
          note: "“Whoever's hearing this, there's a gas station there that sells the best breakfast burrito in California…”",
        },
        {
          label: "Reply?",
          href: "/radio?message=message",
          radio: true,
          todo: "change",
          note: "Built: RESPOND for the first 5 s of their voice, then your reply records. Script has an AI voice asking “Do you want to reply to this message?”",
        },
      ],
    },
    {
      n: "3",
      title: "Company: one stranger",
      time: "1:45",
      steps: [
        {
          label: "Company off",
          href: "/radio?call=off",
          radio: true,
          todo: "change",
          note: "Engraved RADIO; the script calls it Company. Skip the load-in here: it belongs to 2 · Radio loads in.",
        },
        {
          label: "Mood: pick an intent",
          href: "/radio?call=pick",
          radio: true,
          note: "Built: flip the switch on and the four keys ask what you're up for (Meet someone, Chit-chat, Share a story, Off my chest). The script's Something real is this pick.",
        },
        { label: "Connecting", href: "/radio?call=connecting", radio: true },
        {
          label: "Meet @Mothlight",
          href: "/radio?me=NightOwl&peer=Mothlight&miles=84",
          radio: true,
          note: "Flip on and pick an intent: the radio says “@NightOwl, meet @Mothlight. You've got 84 miles of road together. To start, where are you both headed tonight?”, a page on the LCD per line.",
        },
        {
          label: "@Mothlight speaking",
          href: "/radio?call=connected&speaking=them",
          radio: true,
          todo: "change",
          note: "Their character hops with sound waves, but it alternates on its own. Pin it on cue (?speaking=them isn't wired yet).",
        },
        {
          label: "Ray answers back",
          href: "/radio?call=connected&speaking=you",
          radio: true,
          todo: "new",
          note: "A second animation for you talking, so the two sides read differently.",
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
          href: "/radio?message=question",
          radio: true,
          todo: "change",
          note: "Built: plays a sample question (@urmom2424, favorite song). Script: “A question from @NightOwl, left right here: what got you through today?” Figma 123:441.",
        },
        {
          label: "Answering",
          href: blank("Answering"),
          todo: "new",
          note: "Answering animation: the reply recorder on the LCD. Figma 123:502, 123:727.",
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
      title: "Behind the scenes",
      time: "3:45",
      steps: [
        { label: "Night mode", href: "/radio", radio: true, go: () => pickTheme("dark") },
        {
          label: "Stay-awake warning",
          href: blank("Stay-awake warning"),
          todo: "new",
          note: "A warning to stay awake on long drives.",
        },
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
        "rounded-token border px-2 py-1 text-left text-xs uppercase transition-colors duration-150 ease-out",
        active ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-surface-raised",
        className,
      )}
    >
      {children}
    </button>
  );
}
