import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState, type ReactNode } from "react";
import { TopBar } from "@/components/journey/TopBar";
import { HardwareButton, LcdScreen, Led, RockerSwitch } from "@/components/radio";
import { cn } from "@/components/ui/cn";

/*
  Where "What brings you here today" could live, so drivers who never plan to take a call
  don't have to answer it before every trip. Review mockups only: none are wired into the app
  (Start your journey still opens /intents).

  Based on the product framing artifact ("The road used to talk", Oct 17). It has no up-front
  intent step: each intent happens at its own moment in the drive.
  - Calls: "Flipping the radio on means 'I'll take a call.'"
  - Leave a story: "Say 'Breaker, leave a story,' or press the one button."
  - Answer: "Story plays → 'Want to respond?' → voice reply."
  - Just drive: the default, "Drive: dithered route, radio off."
  - First trip: "Your first journey is listen-only... 'You heard 12 stories tonight. Want to
    leave your own, or take calls?'"
  - Matching: "Optionally shares a journey type: heading home, on the clock, moving, last run."
  - Mood: "Laugh, Company or Something real decides what plays."

  Team note (Oct 18): intent is mainly for matching. A match is distance (shared stretch of
  road) plus intent, so E asks for intent only when you flip the radio on to take a call.
  Intents: connect with someone new, just chit-chat, share a story, get something off my
  chest. They line up with the artifact's moods (Company, Laugh, Something real).
*/

const meta: Meta = {
  title: "Prototypes/Intent placement",
  parameters: { layout: "centered" },
};
export default meta;

function Phone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grain flex h-[852px] w-[393px] flex-col overflow-hidden border border-border bg-background uppercase text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A note beside each mock: where it comes from in the artifact, what it's good at, what to watch. */
function Note({ title, source, pros, cons }: { title: string; source: string; pros: string; cons: string }) {
  return (
    <aside className="w-[300px] space-y-3 text-sm normal-case text-foreground">
      <h2 className="text-base font-bold">{title}</h2>
      <p className="text-foreground/60">
        <span className="text-marker-sky">From the artifact: </span>
        {source}
      </p>
      <p>
        <span className="text-marker-lime">Good: </span>
        {pros}
      </p>
      <p>
        <span className="text-marker-magenta">Watch out: </span>
        {cons}
      </p>
    </aside>
  );
}

function Side({ children, note }: { children: ReactNode; note: ReactNode }) {
  return (
    <div className="flex items-start gap-10">
      {children}
      {note}
    </div>
  );
}

function Lcd({ children }: { children: ReactNode }) {
  return (
    <LcdScreen className="absolute left-[156px] top-[18px] h-[130px] w-[221px] flex-col gap-1.5 px-3 text-center font-mono text-[13px] leading-tight">
      {children}
    </LcdScreen>
  );
}

/* ------------------------------------------------------------------------------------------ */

type Moment =
  | { kind: "drive" }
  | { kind: "connecting" }
  | { kind: "call" }
  | { kind: "ask" }
  | { kind: "recording"; question: boolean }
  | { kind: "pinned"; question: boolean }
  | { kind: "question" }
  | { kind: "answering" };

/**
 * A. No intent page: each intent at its own moment (the artifact's hero flow). You set out
 * "just driving" with the radio off. The rocker is the call intent, one key leaves a story,
 * and answering only comes up when someone's question plays.
 */
export const A_AtTheMoment: StoryObj = {
  name: "A. No intent page: each intent at its moment",
  render: function Render() {
    const [m, setM] = useState<Moment>({ kind: "drive" });
    const radioOn = m.kind === "connecting" || m.kind === "call";

    // Mocked timing: connecting resolves, a recording finishes, a pin confirms.
    useEffect(() => {
      const next: Partial<Record<Moment["kind"], [number, Moment]>> = {
        connecting: [1800, { kind: "call" }],
        recording: [2200, { kind: "pinned", question: m.kind === "recording" && m.question }],
        answering: [2200, { kind: "pinned", question: false }],
        pinned: [2600, { kind: "drive" }],
      };
      const step = next[m.kind];
      if (!step) return;
      const t = setTimeout(() => setM(step[1]), step[0]);
      return () => clearTimeout(t);
    }, [m]);

    return (
      <Side
        note={
          <Note
            title="A. Each intent at its moment"
            source={`"Flipping the radio on means I'll take a call." Leave a story is "the one button" (or "Breaker, leave a story"). Answering is "Want to respond?" when a question plays.`}
            pros="Nobody is asked anything before the drive. Each intent shows up where it's used, and the rocker already carries the call intent, so the intent page can go."
            cons="Needs one more key on the console (Leave a story), and drivers learn the controls by using them rather than from a list up front."
          />
        }
      >
        <div className="flex flex-col items-center gap-3">
          <Phone className="[background:var(--panel-noise),var(--casing-gradient)]">
            <div className="relative mx-[14px] mt-[64px] flex h-[509px] items-center justify-center bg-[#111] text-[10px] text-white/40">
              Live map · radio off, stories find you
            </div>
            <div className="relative flex-1">
              <div className="absolute left-[30px] top-[20px] flex items-center gap-2">
                <span className="text-[11px] font-bold text-label/80">RADIO</span>
                <Led on={radioOn} blink={m.kind === "connecting"} />
              </div>
              <RockerSwitch
                className="absolute left-[26px] top-[44px]"
                on={radioOn}
                label="Radio: take a call"
                onChange={(on) => setM(on ? { kind: "connecting" } : { kind: "drive" })}
              />
              <Lcd>
                {m.kind === "drive" && <span>JUST DRIVING</span>}
                {m.kind === "connecting" && <span>CONNECTING…</span>}
                {m.kind === "call" && (
                  <span>
                    YOU SHARE 84 MILES OF <span className="whitespace-nowrap">I-40</span> WITH @HUFFLEPUFF23
                  </span>
                )}
                {m.kind === "ask" && (
                  <>
                    <span>A STORY, OR A QUESTION</span>
                    <span>FOR THE NEXT DRIVER?</span>
                  </>
                )}
                {m.kind === "recording" && (
                  <>
                    <span>● RECORDING</span>
                    <span className="text-[11px] normal-case">Talk for up to 60 seconds</span>
                  </>
                )}
                {m.kind === "pinned" && (
                  <span className="text-[12px]">PINNED NEAR EXIT 335. IT&apos;LL GO LIVE AFTER IT&apos;S REVIEWED.</span>
                )}
                {m.kind === "question" && (
                  <>
                    <span className="text-[11px] normal-case">@Jhfnx asks</span>
                    <span>WHO ARE YOU DRIVING HOME TO?</span>
                    <span className="text-[11px] normal-case">Want to respond?</span>
                  </>
                )}
                {m.kind === "answering" && (
                  <>
                    <span>● REPLYING</span>
                    <span className="text-[11px] normal-case">to @Jhfnx</span>
                  </>
                )}
              </Lcd>
              <div className="absolute left-[26px] top-[166px] flex w-[351px] gap-2">
                {m.kind === "ask" ? (
                  <>
                    <HardwareButton className="flex-1" onClick={() => setM({ kind: "recording", question: false })}>
                      <span className="text-xs font-bold uppercase opacity-80">Story</span>
                    </HardwareButton>
                    <HardwareButton className="flex-1" onClick={() => setM({ kind: "recording", question: true })}>
                      <span className="text-xs font-bold uppercase opacity-80">Question</span>
                    </HardwareButton>
                  </>
                ) : m.kind === "question" ? (
                  <>
                    <HardwareButton className="flex-1" onClick={() => setM({ kind: "answering" })}>
                      <span className="text-xs font-bold uppercase opacity-80">Respond</span>
                    </HardwareButton>
                    <HardwareButton className="flex-1" onClick={() => setM({ kind: "drive" })}>
                      <span className="text-xs font-bold uppercase opacity-80">Not now</span>
                    </HardwareButton>
                  </>
                ) : (
                  <HardwareButton
                    className="flex-1"
                    disabled={radioOn || m.kind !== "drive"}
                    onClick={() => setM({ kind: "ask" })}
                  >
                    <span className="text-xs font-bold uppercase opacity-80">Leave a story</span>
                  </HardwareButton>
                )}
              </div>
            </div>
          </Phone>
          {/* Demo only: what happens when you cross a question marker on the road. */}
          <button
            type="button"
            onClick={() => setM({ kind: "question" })}
            disabled={m.kind !== "drive"}
            className="border border-border px-3 py-2 text-xs uppercase text-foreground disabled:opacity-40"
          >
            Demo: cross a question marker
          </button>
        </div>
      </Side>
    );
  },
};

/**
 * B. Ask at the end of your first drive. The first journey is listen-only with no account;
 * arriving asks whether you want to leave stories or take calls, and that's where you verify.
 */
export const B_AtFirstArrival: StoryObj = {
  name: "B. Ask when you arrive from your first drive",
  render: function Render() {
    const [step, setStep] = useState<"ask" | "verify" | "listen">("ask");
    return (
      <Side
        note={
          <Note
            title="B. Ask at your first arrival"
            source={`"No onboarding up front. Your first journey is listen-only, with no account." Step 1, Arrive: "You heard 12 stories tonight. Want to leave your own, or take calls?" Step 2, Verify: phone, code, 18+.`}
            pros="People choose after they understand the product. The 18+ check happens parked, not mid-drive, so calls and stories are unlocked before the next trip."
            cons="Only asked once. Someone who says 'just listen' still needs A's rocker and story key to change their mind later."
          />
        }
      >
        <Phone>
          <TopBar />
          <div className="flex flex-1 flex-col px-[31px]">
            <p className="mt-6 text-center text-xl">Barstow → Memphis</p>
            <p className="mt-2 text-center text-sm text-foreground/60">1,820 miles · 2 nights</p>
            <div className="mt-8 flex h-[200px] items-center justify-center border border-dashed border-border text-[10px] text-foreground/40">
              Your route, drawn
            </div>
            {step === "ask" && (
              <div className="mt-10 flex flex-col gap-3">
                <p className="text-center text-base normal-case">
                  You heard <span className="text-marker-lime">12 stories</span> tonight.
                  <br />
                  Want to leave your own, or take calls?
                </p>
                <button type="button" onClick={() => setStep("verify")} className="mt-3 min-h-[45px] bg-accent uppercase text-base text-accent-foreground">
                  Take calls
                </button>
                <button type="button" onClick={() => setStep("verify")} className="min-h-[45px] border border-foreground text-base uppercase">
                  Leave stories
                </button>
                <button type="button" onClick={() => setStep("listen")} className="min-h-11 text-sm uppercase text-muted">
                  Just listen for now
                </button>
              </div>
            )}
            {step === "verify" && (
              <div className="mt-10 flex flex-col gap-3 text-center">
                <p className="text-base">Verify to speak</p>
                <p className="text-[11px] normal-case text-foreground/60">
                  Phone number and a one-time code, then confirm you&apos;re 18 or older. Your number is never shown.
                </p>
                <div className="mt-2 flex h-[47px] items-center rounded-token border border-foreground/60 px-3 text-left text-xl text-foreground/40">
                  +1
                </div>
                <button type="button" onClick={() => setStep("ask")} className="min-h-11 text-sm uppercase text-muted">
                  Back
                </button>
              </div>
            )}
            {step === "listen" && (
              <div className="mt-10 flex flex-col gap-3 text-center">
                <p className="text-base">Welcome to the road</p>
                <p className="text-[11px] normal-case text-foreground/60">
                  Stories will keep finding you. Flip the radio on any time you want company.
                </p>
                <button type="button" onClick={() => setStep("ask")} className="min-h-11 text-sm uppercase text-muted">
                  Back
                </button>
              </div>
            )}
          </div>
        </Phone>
      </Side>
    );
  },
};

const JOURNEY_TYPES = ["Heading home", "On the clock", "Moving", "Last run"] as const;

/**
 * C. Optional journey type on Destination. The intent page goes; in its place, an optional
 * row the radio uses to match you. Nothing is selected unless you pick it.
 */
export const C_JourneyType: StoryObj = {
  name: "C. Optional journey type on Destination",
  render: function Render() {
    const [type, setType] = useState<string | null>(null);
    return (
      <Side
        note={
          <Note
            title="C. Optional journey type"
            source={`Matching: "Optionally shares a journey type: heading home, on the clock, moving, last run." Drive tab: "start a journey by destination or duration."`}
            pros="Replaces the intent question with one that's actually useful: it shapes who you're matched with, and it's skippable because nothing is picked by default."
            cons="Only matters to people who take calls, so it's still a question shown to drivers who never will. Could live behind the radio switch instead."
          />
        }
      >
        <Phone>
          <TopBar />
          <p className="mt-6 text-center text-base">Enter your destination</p>
          <div className="mx-[31px] mt-4 flex h-[47px] items-center rounded-token border border-foreground/60 px-3 text-xl">
            Memphis, TN
          </div>
          <fieldset className="mx-[31px] mt-5">
            <legend className="mb-2 text-[10px] text-foreground/60">What kind of drive? · optional</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {JOURNEY_TYPES.map((t) => {
                const on = t === type;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setType(on ? null : t)}
                    className={cn(
                      "min-h-11 rounded-token border px-2 text-[11px] uppercase transition-colors",
                      on ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:text-label",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] normal-case text-foreground/60">
              {type ? "We'll try to pair you with someone on the same kind of drive." : "Skip it and you'll still hear stories."}
            </p>
          </fieldset>
          <div className="mx-[31px] mt-8 flex h-[200px] items-center justify-center border border-dashed border-border text-[10px] text-foreground/40">
            Route map
          </div>
          <dl className="mx-[44px] mt-8 grid grid-cols-2 gap-y-2 text-sm">
            <dd>27 hr trip</dd>
            <dd className="text-right text-marker-lime">24 stories</dd>
            <dd className="text-[10px] text-foreground/40">2,929 km drive</dd>
            <dd className="text-right text-marker-magenta">6 questions</dd>
          </dl>
          <div className="mt-auto px-[44px] pb-14">
            <div className="flex min-h-[45px] items-center justify-center gap-3 bg-accent text-base text-accent-foreground">
              Start journey
              <span aria-hidden className="size-2.5 rounded-full bg-current" />
            </div>
          </div>
        </Phone>
      </Side>
    );
  },
};

const MOODS = ["Laugh", "Company", "Something real"] as const;

/**
 * D. Mood in Profile settings, set once. The artifact's "what you're up for" is a mood that
 * decides what plays (and who you're matched with), not a per-trip intent.
 */
export const D_MoodInProfile: StoryObj = {
  name: "D. Mood, set once in Profile",
  render: function Render() {
    const [mood, setMood] = useState<(typeof MOODS)[number]>("Company");
    return (
      <Side
        note={
          <Note
            title="D. Mood in Profile"
            source={`"The right mood: Laugh, Company or Something real decides what plays." Profile tab: "handle, avatar, settings, report." Calls match on "route overlap and mood."`}
            pros="Covers what the 'Just drive' option was really asking (what do you want to hear) without a screen per trip. It also feeds call matching."
            cons="Set-and-forget, so it can go stale. Worth a quick way to change it mid-drive too (the call settings already have Mood)."
          />
        }
      >
        <Phone>
          <TopBar />
          <div className="flex flex-1 flex-col px-[31px]">
            <p className="mt-6 text-sm text-foreground/60">Profile · Settings</p>
            <div className="mt-6 border-y border-border">
              <div className="py-4">
                <p className="text-sm">What are you in the mood for?</p>
                <p className="mt-1 text-[10px] normal-case text-foreground/60">Decides which stories play and who you&apos;re matched with</p>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={mood === m}
                      onClick={() => setMood(m)}
                      className={cn(
                        "min-h-11 rounded-token border px-1 text-[10px] uppercase leading-tight",
                        mood === m ? "border-foreground bg-foreground text-background" : "border-border text-muted",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border py-4 text-sm">
                <span>Story pacing</span>
                <span className="text-[11px] normal-case text-foreground/60">About 1 every 20–30 min</span>
              </div>
              <div className="flex items-center justify-between border-t border-border py-4 text-sm">
                <span>Handle</span>
                <span className="text-[11px] normal-case text-foreground/60">@NightOwl</span>
              </div>
              <div className="flex items-center justify-between border-t border-border py-4 text-sm">
                <span>Sound</span>
                <span className="text-[11px] text-foreground/60">On</span>
              </div>
            </div>
          </div>
        </Phone>
      </Side>
    );
  },
};

/**
 * What you're on the radio for: the team's intents, each tied to the artifact's moods
 * ("Laugh, Company or Something real") and its storytelling layer ("Stories told together").
 * `key` is the short label that fits a console key; the rest is LCD copy.
 */
const MATCH_INTENTS = [
  {
    id: "new",
    key: "Meet someone",
    label: "Connect with someone new",
    looking: "Looking for someone new on your road",
    match: "also here to meet someone",
  },
  {
    id: "chat",
    key: "Chit-chat",
    label: "Just here to chit-chat",
    looking: "Looking for someone up for a chat",
    match: "also up for a chat",
  },
  {
    id: "story",
    key: "Share a story",
    label: "Share a story",
    looking: "Looking for someone swapping stories",
    match: "also swapping stories",
  },
  {
    id: "chest",
    key: "Off my chest",
    label: "Get something off my chest",
    looking: "Looking for someone who'll listen",
    match: "also up for something real",
  },
] as const;

type MatchIntent = (typeof MATCH_INTENTS)[number];

/**
 * E. Intent at the radio switch. Intent is what matches you (with distance), so only people who
 * take calls ever see it: flipping the radio on asks what you're up for, your last pick is
 * remembered (and used on its own after 3 seconds, so it's no extra tap while driving), and the
 * match line says why you were paired.
 */
export const E_IntentAtRadioSwitch: StoryObj = {
  name: "E. Pick intent when you flip the radio on",
  render: function Render() {
    const [phase, setPhase] = useState<"off" | "pick" | "connecting" | "call">("off");
    const [intent, setIntent] = useState<MatchIntent | null>(null);
    const [last, setLast] = useState<MatchIntent | null>(null);
    const choose = (t: MatchIntent) => {
      setIntent(t);
      setLast(t);
      setPhase("connecting");
    };

    // Asking again with a remembered pick: keep it after 3 seconds if nothing is pressed.
    useEffect(() => {
      if (phase !== "pick" || !last) return;
      const t = setTimeout(() => {
        setIntent(last);
        setPhase("connecting");
      }, 3000);
      return () => clearTimeout(t);
    }, [phase, last]);
    useEffect(() => {
      if (phase !== "connecting") return;
      const t = setTimeout(() => setPhase("call"), 1800);
      return () => clearTimeout(t);
    }, [phase]);

    const radioOn = phase !== "off";
    return (
      <Side
        note={
          <Note
            title="E. Intent at the radio switch"
            source={`"Flipping the radio on means I'll take a call." "Calls cross types through route overlap and mood." Moods: "Laugh, Company or Something real." Motives include "Humour, shared experience" and "Catharsis, being seen."`}
            pros="Intent only exists for matching, so it's only asked of people who get matched. Drivers who never flip the radio on never see it. After the first time it's remembered, so turning on is one motion again."
            cons="The first pick happens while driving (four big keys, one tap). 'Off my chest' needs the most care: the artifact calls catharsis 'low, but most valued', and it's where crisis routing matters."
          />
        }
      >
        <Phone className="[background:var(--panel-noise),var(--casing-gradient)]">
          <div className="mx-[14px] mt-[64px] flex h-[509px] items-center justify-center bg-[#111] text-[10px] text-white/40">
            Live map
          </div>
          <div className="relative flex-1">
            <div className="absolute left-[30px] top-[20px] flex items-center gap-2">
              <span className="text-[11px] font-bold text-label/80">RADIO</span>
              <Led on={radioOn} blink={phase === "connecting"} />
            </div>
            <RockerSwitch
              className="absolute left-[26px] top-[44px]"
              on={radioOn}
              label="Radio: take a call"
              onChange={(on) => setPhase(on ? "pick" : "off")}
            />
            <Lcd>
              {phase === "off" && <span>JUST DRIVING</span>}
              {phase === "pick" && (
                <>
                  <span>WHAT ARE YOU UP FOR?</span>
                  <span className="text-[11px] normal-case">
                    {last ? `Keeping "${last.key}" in 3 s` : "Helps us find your match"}
                  </span>
                </>
              )}
              {phase === "connecting" && (
                <>
                  <span>CONNECTING…</span>
                  <span className="text-[11px] normal-case">{intent?.looking}</span>
                </>
              )}
              {phase === "call" && (
                <>
                  <span>
                    YOU SHARE 84 MILES OF <span className="whitespace-nowrap">I-40</span>
                  </span>
                  <span className="text-[11px] normal-case">@Hufflepuff23 · {intent?.match}</span>
                </>
              )}
            </Lcd>
            <div className="absolute left-[26px] top-[166px] flex w-[351px] gap-2">
              {phase === "pick" ? (
                MATCH_INTENTS.map((t) => (
                  <HardwareButton
                    key={t.id}
                    className="flex-1"
                    pressed={t.id === last?.id}
                    onClick={() => choose(t)}
                    aria-label={t.label}
                  >
                    <span className="text-[10px] font-bold uppercase leading-tight opacity-80">{t.key}</span>
                  </HardwareButton>
                ))
              ) : (
                <HardwareButton className="flex-1" disabled>
                  <span className="text-[10px] font-bold uppercase opacity-60">
                    {phase === "off" ? "Flip the radio on to take a call" : "On a call"}
                  </span>
                </HardwareButton>
              )}
            </div>
          </div>
        </Phone>
      </Side>
    );
  },
};

/** All five next to each other, for the review. */
export const Compare: StoryObj = {
  name: "Compare all five",
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-wrap gap-12">
      {[E_IntentAtRadioSwitch, A_AtTheMoment, B_AtFirstArrival, C_JourneyType, D_MoodInProfile].map((s, i) => {
        const Story = s.render as () => ReactNode;
        return <Story key={i} />;
      })}
    </div>
  ),
};
