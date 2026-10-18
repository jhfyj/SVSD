import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta: Meta = { title: "Foundations", parameters: { layout: "padded" } };
export default meta;

const colors = [
  ["background", "Canvas"],
  ["surface", "Surface"],
  ["surface-raised", "Surface raised"],
  ["border", "Border"],
  ["muted", "Muted text"],
  ["label", "Label"],
  ["foreground", "Text"],
  ["accent", "Primary button"],
  ["danger", "Danger"],
  ["lcd", "LCD screen"],
  ["led", "LED"],
  ["marker-lime", "Marker lime"],
  ["marker-sky", "Marker sky"],
  ["marker-magenta", "Marker magenta"],
  ["marker-orange", "Marker orange"],
] as const;

export const Colors: StoryObj = {
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4 uppercase">
      {colors.map(([token, name]) => (
        <div key={token} className="flex flex-col gap-2">
          <div className="h-16 border border-border" style={{ background: `var(--${token})` }} />
          <span className="text-xs">{name}</span>
          <code className="text-[10px] text-foreground/60">--{token}</code>
        </div>
      ))}
    </div>
  ),
};

export const TextOpacity: StoryObj = {
  name: "Text hierarchy",
  render: () => (
    <div className="flex flex-col gap-2 uppercase">
      {[100, 85, 80, 60, 50, 40].map((o) => (
        <span key={o} className="text-base" style={{ opacity: o / 100 }}>
          White at {o}%{o < 50 && " (below AA under 18px)"}
        </span>
      ))}
    </div>
  ),
};

export const Typography: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4 uppercase">
      {[24, 20, 16, 14, 12, 11, 10].map((s) => (
        <span key={s} style={{ fontSize: s }}>Geist Mono {s}px · Start journey</span>
      ))}
      <span className="text-[13px] font-bold">Geist Mono Bold 13px · Label</span>
      <span className="font-display text-5xl">89.9</span>
      <span className="font-display text-2xl">Enter your destination</span>
      <p className="max-w-md text-xs normal-case text-foreground/60">
        The display face is Digital-7 (personal-use license, not bundled). Until its file is added to public/fonts, it
        falls back to Geist Mono.
      </p>
    </div>
  ),
};

export const Hardware: StoryObj = {
  render: () => (
    <div className="flex gap-6">
      {[
        ["Panel", "var(--panel-gradient)", undefined],
        ["Button", "var(--button-gradient)", "var(--button-highlight)"],
        ["End call", "var(--end-call-gradient)", undefined],
        ["LCD", "var(--lcd)", "var(--lcd-inset)"],
      ].map(([name, bg, shadow]) => (
        <div key={name} className="flex flex-col gap-2 text-xs uppercase">
          <div className="size-24" style={{ background: bg, boxShadow: shadow }} />
          {name}
        </div>
      ))}
    </div>
  ),
};
