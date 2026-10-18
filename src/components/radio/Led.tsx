import { cn } from "../ui/cn";

export type LedTone = "live" | "connecting" | "error";

export type LedProps = {
  on: boolean;
  /** Green when the call is live, amber while connecting, red when the connection is lost. */
  tone?: LedTone;
  /** Glow switches on and off (two frames), for connecting. */
  blink?: boolean;
  className?: string;
};

/** The lit bulb and its glow for each state: the whole bulb takes the colour, with a hot centre. */
const TONES: Record<LedTone, { bulb: string; glow: string }> = {
  live: { bulb: "bg-led", glow: "bg-led/70" },
  connecting: { bulb: "bg-led-amber", glow: "bg-led-amber/70" },
  error: { bulb: "bg-led-red", glow: "bg-led-red/80" },
};
/** Light on a lit bulb: a hot white centre, shading toward the rim. */
const HOT_CENTRE = "bg-[radial-gradient(circle,rgb(255_255_255/0.85)_0%,transparent_55%,rgb(0_0_0/0.2)_100%)]";

/** 8px indicator: a dark bulb in a grey ring when off; lit green, amber or red with a matching glow. */
export function Led({ on, tone = "live", blink, className }: LedProps) {
  const { bulb, glow } = TONES[tone];
  return (
    <span aria-hidden className={cn("relative inline-block size-2", className)}>
      {on && <span className={cn("absolute -inset-0.5 rounded-full blur-[3px]", glow, blink && "caret-blink")} />}
      <span className={cn("absolute inset-0 rounded-full border border-led-ring", on ? cn(bulb, HOT_CENTRE) : "bg-marker-border")} />
    </span>
  );
}
