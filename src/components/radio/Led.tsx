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
  live: { bulb: "bg-[radial-gradient(circle,#eaffe6_0%,#6dff5c_55%,#2fbf3a_100%)]", glow: "bg-[#55ff60]/70" },
  connecting: { bulb: "bg-[radial-gradient(circle,#fff6d6_0%,#ffbf2f_55%,#d98a00_100%)]", glow: "bg-[#ffb020]/70" },
  error: { bulb: "bg-[radial-gradient(circle,#ffe0e0_0%,#ff3535_55%,#c01818_100%)]", glow: "bg-[#ff3535]/80" },
};

/** 8px indicator: a dark bulb in a grey ring when off; lit green, amber or red with a matching glow. */
export function Led({ on, tone = "live", blink, className }: LedProps) {
  const { bulb, glow } = TONES[tone];
  return (
    <span aria-hidden className={cn("relative inline-block size-2", className)}>
      {on && <span className={cn("absolute -inset-0.5 rounded-full blur-[3px]", glow, blink && "caret-blink")} />}
      <span className={cn("absolute inset-0 rounded-full border border-[#aeaeae]", on ? bulb : "bg-[#3a3a3a]")} />
    </span>
  );
}
