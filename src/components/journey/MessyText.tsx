import { cn } from "../ui/cn";

/*
  Ways to rough up the trip-length readout so it reads less like a clock and more like
  something written down. Every look uses the foreground color only, so it follows the
  time-of-day theme. The mess is seeded by each glyph and its place, so the same time
  always looks the same and only the glyphs that change move.
*/

export type MessyLook = "tidy" | "jitter" | "misprint" | "mixed" | "scrawl";

/** A repeatable random number in [-1, 1) for a glyph. */
export function wobble(i: number, ch: string, salt = 0) {
  const x = Math.sin(i * 127.1 + ch.charCodeAt(0) * 311.7 + salt * 74.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

const FACES = ["font-display", "font-mono", "font-serif italic"];

export function MessyText({ text, look, className }: { text: string; look: MessyLook; className?: string }) {
  if (look === "tidy") return <span className={className}>{text}</span>;

  if (look === "misprint") {
    // A second pass that missed the registration, like a cheap risograph.
    return (
      <span className={cn("relative inline-block whitespace-nowrap", className)}>
        <span aria-hidden className="absolute left-[3px] top-[2px] text-foreground/25">{text}</span>
        <span aria-hidden className="absolute -left-[2px] -top-px text-foreground/15">{text}</span>
        <span className="relative">{text}</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-baseline", className)}>
      <span className="sr-only">{text}</span>
      {[...text].map((ch, i) => {
        if (ch === " ") return <span key={i} aria-hidden className="w-[0.35em]" />;
        const turn = wobble(i, ch, 1);
        const lift = wobble(i, ch, 2);
        const size = wobble(i, ch, 3);
        const style =
          look === "jitter"
            ? { transform: `translateY(${lift * 3}px) rotate(${turn * 6}deg)` }
            : look === "scrawl"
              ? {
                  transform: `translateY(${lift * 5}px) rotate(${turn * 10}deg) skewX(${-8 + size * 6}deg)`,
                  fontSize: `${1 + size * 0.18}em`,
                  opacity: 0.75 + (lift + 1) * 0.125,
                }
              : { transform: `translateY(${lift * 2}px) rotate(${turn * 4}deg)`, fontSize: `${1 + size * 0.15}em` };
        const face = look === "mixed" ? FACES[Math.floor(((wobble(i, ch, 4) + 1) / 2) * FACES.length)] : undefined;
        return (
          <span key={i} aria-hidden className={cn("inline-block", face)} style={style}>
            {ch}
          </span>
        );
      })}
    </span>
  );
}
