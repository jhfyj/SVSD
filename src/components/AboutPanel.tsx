/*
  The submission view on a wide screen: what Caravan is and who made it, in a column left of the
  phone. Hidden below lg (1024px), so a real phone only ever shows the app. The phone stage leaves
  room for it (.device-stage in globals.css, and DeviceFrame's fit).
*/

/** Width of the column, in px. DeviceFrame and globals.css use the same number. */
export const ABOUT_WIDTH = 360;

const TEAM = ["Jennifer", "Emily", "Angelina"];

export function AboutPanel() {
  return (
    <aside
      aria-label="About Caravan"
      className="about-panel fixed inset-y-0 left-0 z-40 hidden flex-col justify-center gap-8 overflow-y-auto border-r border-border px-10 py-12 font-mono text-foreground lg:flex"
    >
      <div className="flex flex-col gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG, nothing to optimise */}
        <img src="/caravan-logo.svg" alt="" aria-hidden="true" className="h-14 w-auto self-start" />
        <h1 className="text-2xl uppercase">Caravan</h1>
        <p className="text-base">Stories told by everyone on the road tonight.</p>
      </div>

      <div className="flex flex-col gap-3 text-sm text-foreground/70">
        <p>
          A storytelling app for the road. Drivers hear stories that other drivers left at real spots along the
          route, leave their own by voice, and answer questions waiting on the road.
        </p>
        <p>Late at night, it can match you with a stranger whose road overlaps yours.</p>
        <p>Guided by voice, not by scrolling, so your eyes stay on the road.</p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase text-foreground/70">Team</span>
        <span className="text-sm">{TEAM.join(" · ")}</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase text-foreground/70">Try it</span>
        <span className="text-sm text-foreground/70">
          Tap through on the phone. Press <kbd className="border border-border px-1 text-foreground">`</kbd> to jump
          to any of the six flows.
        </span>
      </div>

      <span className="text-xs uppercase text-foreground/70">SVSD Design Competition · Fall 2026</span>
    </aside>
  );
}