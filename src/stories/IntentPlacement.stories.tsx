import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ReactNode } from "react";
import { INTENTS, type IntentId } from "@/components/journey/IntentPicker";
import { TopBar } from "@/components/journey/TopBar";
import { HardwareButton, LcdScreen, Led, RockerSwitch, ToggleSwitch } from "@/components/radio";
import { cn } from "@/components/ui/cn";
import { ScrambleText } from "@/components/ui/ScrambleText";

/*
  Where "What brings you here today" could live, so drivers who never plan to take a call
  don't have to answer it before every trip. Review mockups only: none of these are wired
  into the app flow yet (Start your journey still opens /intents).

  The intents and their copy come from IntentPicker (the SVSD product doc).
*/

const meta: Meta = {
  title: "Prototypes/Intent placement",
  parameters: { layout: "centered" },
};
export default meta;

const CHOICES = INTENTS.filter((i) => i.id !== "listen");
const label = (id: IntentId) => INTENTS.find((i) => i.id === id)!.label;

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

/** A note under each mock: what changes and what it costs. */
function Note({ title, pros, cons }: { title: string; pros: string; cons: string }) {
  return (
    <aside className="w-[300px] space-y-3 text-sm normal-case text-foreground">
      <h2 className="text-base font-bold">{title}</h2>
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

/** Stand-in for the Destination screen's earth map and trip summary. */
function DestinationBody({ children }: { children?: ReactNode }) {
  return (
    <>
      <p className="mt-6 text-center text-base">Enter your destination</p>
      <div className="mx-[31px] mt-4 flex h-[47px] items-center rounded-token border border-foreground/60 px-3 text-xl">
        Santa Cruz, CA
      </div>
      {children}
      <div className="mx-[31px] mt-10 flex h-[220px] items-center justify-center border border-dashed border-border text-[10px] text-foreground/40">
        Route map
      </div>
      <dl className="mx-[44px] mt-8 grid grid-cols-2 gap-y-2 text-sm">
        <dd>1 hr 18 min trip</dd>
        <dd className="text-right text-marker-lime">37 stories</dd>
        <dd className="text-[10px] text-foreground/40">121 km drive</dd>
        <dd className="text-right text-marker-magenta">6 questions</dd>
      </dl>
      <div className="mt-auto px-[44px] pb-14">
        <div className="flex min-h-[45px] items-center justify-center gap-3 bg-accent text-base text-accent-foreground">
          Start journey
          <span aria-hidden className="size-2.5 rounded-full bg-current" />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------------------------------ */

/**
 * A. On the radio switch. Nothing to answer before the drive: everyone lands on the radio
 * "just driving". Flipping the radio ON asks what you're up for on the LCD, and the three
 * console keys become the choices. Drivers who never turn the radio on never see it.
 */
export const A_OnTheRadioSwitch: StoryObj = {
  name: "A. When you flip the radio on",
  render: function Render() {
    const [on, setOn] = useState(false);
    const [picked, setPicked] = useState<IntentId | null>(null);
    return (
      <Side
        note={
          <Note
            title="A. When you flip the radio on"
            pros="Zero friction for people who just drive. The question shows up at the exact moment it matters, on hardware they're already touching."
            cons="Needs a decision while driving (one tap, but still). The verified-phone check for calls would have to happen here too, mid-trip."
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
              <Led on={on} />
            </div>
            <RockerSwitch
              className="absolute left-[26px] top-[44px]"
              on={on}
              onChange={(v) => {
                setOn(v);
                setPicked(null);
              }}
            />
            <LcdScreen className="absolute left-[156px] top-[18px] h-[130px] w-[221px] flex-col gap-2 px-3 text-center">
              {!on ? (
                <span className="text-sm">Just driving</span>
              ) : picked ? (
                <>
                  <span className="text-[10px]">{label(picked)}</span>
                  <span className="text-sm">
                    {picked === "calls" ? "Connecting…" : picked === "story" ? "Recording…" : "Next question…"}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm">What are you up for?</span>
                  <span className="text-[10px] normal-case">Pick a key below</span>
                </>
              )}
            </LcdScreen>
            <div className="absolute left-[26px] top-[166px] flex w-[351px] gap-2">
              {CHOICES.map((c) => (
                <HardwareButton
                  key={c.id}
                  className="flex-1"
                  disabled={!on}
                  pressed={picked === c.id}
                  onClick={() => setPicked(c.id)}
                >
                  {/* "Radio on" reads oddly on a radio that's already on, so the call key says what it does. */}
                  <span className="text-xs font-bold uppercase opacity-80">{c.id === "calls" ? "Take a call" : c.label}</span>
                </HardwareButton>
              ))}
            </div>
          </div>
        </Phone>
      </Side>
    );
  },
};

/**
 * B. A row on the Destination screen. The intent page goes away; the same choice is a compact
 * row under the address, already set to "Just drive", so skipping it costs nothing.
 */
export const B_OnDestination: StoryObj = {
  name: "B. A row on the Destination screen",
  render: function Render() {
    const [intent, setIntent] = useState<IntentId>("listen");
    const current = INTENTS.find((i) => i.id === intent)!;
    return (
      <Side
        note={
          <Note
            title="B. A row on the Destination screen"
            pros="One less screen for everyone. Defaults to Just drive, so it's skippable, but company is still offered before you leave."
            cons="Adds weight to a screen that's already doing a lot (search, map, trip summary). Easy to miss if you do want calls."
          />
        }
      >
        <Phone>
          <TopBar />
          <DestinationBody>
            <fieldset className="mx-[31px] mt-5">
              <legend className="mb-2 text-[10px] text-foreground/60">This drive</legend>
              <div className="grid grid-cols-4 gap-1.5">
                {INTENTS.map((item) => {
                  const on = item.id === intent;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setIntent(item.id)}
                      className={cn(
                        "min-h-11 rounded-token border px-1 text-[10px] uppercase leading-tight transition-colors",
                        on ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:text-label",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] normal-case text-foreground/60">
                {current.line}
                {"verified" in current && " · needs a verified phone, 18+"}
              </p>
            </fieldset>
          </DestinationBody>
        </Phone>
      </Side>
    );
  },
};

/**
 * C. In Settings, set once. "Take calls", "Leave stories" and "Answer questions" sit with the
 * radio's other settings and are remembered, so there's no per-trip question at all.
 */
export const C_InSettings: StoryObj = {
  name: "C. Set once in radio Settings",
  render: function Render() {
    const [on, setOn] = useState({ calls: false, story: true, answer: true, questions: true });
    const rows: { key: keyof typeof on; label: string; line: string }[] = [
      { key: "calls", label: "Take calls", line: "Want company on this stretch? · verified phone, 18+" },
      { key: "story", label: "Leave stories", line: "Tell the next driver something" },
      { key: "answer", label: "Answer questions", line: "Someone on this road asked you something" },
      { key: "questions", label: "Enable surprises", line: "Already in Settings today" },
    ];
    return (
      <Side
        note={
          <Note
            title="C. Set once in radio Settings"
            pros="Nobody is asked every trip. It sits with the questions/surprises toggles that already live there, and it's a natural spot to report someone too."
            cons="People who'd enjoy calls may never discover them. Turning calls on means finding Settings first, so calls could feel hidden."
          />
        }
      >
        <Phone className="[background:var(--panel-noise),var(--casing-gradient)]">
          {/* The settings panel grows up over the map, as it does on the radio today. */}
          <div className="mx-[14px] mt-[64px] flex flex-1 items-center justify-center bg-[#111] text-[10px] text-white/40">
            Live map
          </div>
          <section className="px-[26px] pb-6 pt-4">
            <span className="px-1 text-[11px] font-bold text-label/80">SETTINGS</span>
            {rows.map((r) => (
              <div key={r.key} className="flex min-h-14 items-center justify-between gap-3 border-b border-black/20 px-1 last:border-b-0">
                <span className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-bold opacity-80">{r.label}</span>
                  <span className="text-[10px] normal-case opacity-60">{r.line}</span>
                </span>
                <ToggleSwitch on={on[r.key]} onChange={(v) => setOn({ ...on, [r.key]: v })} label={r.label} />
              </div>
            ))}
          </section>
          <div className="flex gap-2 px-[26px] pb-8">
            {["Music", "Speaker", "Settings"].map((b) => (
              <HardwareButton key={b} className="flex-1" pressed={b === "Settings"}>
                <span className="text-xs font-bold opacity-70">{b}</span>
              </HardwareButton>
            ))}
          </div>
        </Phone>
      </Side>
    );
  },
};

/**
 * D. Two ways in from Start. The big square is "Just drive" and goes straight to Destination;
 * the other intents sit underneath as smaller ways in. Picking one is the opt-in.
 */
export const D_OnStart: StoryObj = {
  name: "D. Two ways in from Start",
  render: () => (
    <Side
      note={
        <Note
          title="D. Two ways in from Start"
          pros="The default path skips the question completely, and company/stories are still visible on the very first screen."
          cons="Competes with Recent journeys for space under the Start square. Changing your mind mid-drive still needs somewhere on the radio (A or C)."
        />
      }
    >
      <Phone>
        <TopBar />
        <div className="flex flex-1 flex-col items-center gap-8 pt-[72px]">
          <div className="flex flex-col items-center gap-[18px]">
            <span className="text-xl">
              <ScrambleText>Start your journey</ScrambleText>
            </span>
            <span className="flex size-[220px] flex-col items-center justify-center gap-3 border border-foreground/80">
              <svg aria-hidden viewBox="0 0 64 64" className="size-14 stroke-foreground" strokeWidth={3}>
                <path d="M32 16v32M16 32h32" />
              </svg>
              <span className="text-[10px] text-foreground/60">Just drive</span>
            </span>
          </div>
          <div className="w-full px-[44px]">
            <p className="mb-2 text-[10px] text-foreground/60">Or start with</p>
            <div className="grid grid-cols-3 gap-2">
              {CHOICES.map((c) => (
                <span
                  key={c.id}
                  className="flex min-h-[72px] flex-col justify-between rounded-token border border-border p-2 text-[10px] leading-tight"
                >
                  {c.label}
                  <span className="normal-case text-foreground/50">{c.line}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <span className="self-center pb-10 text-sm text-muted">Profile</span>
      </Phone>
    </Side>
  ),
};

/** All four next to each other, for the review. */
export const Compare: StoryObj = {
  name: "Compare all four",
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-wrap gap-12">
      {[A_OnTheRadioSwitch, B_OnDestination, C_InSettings, D_OnStart].map((s, i) => {
        const Story = s.render as () => ReactNode;
        return <Story key={i} />;
      })}
    </div>
  ),
};
