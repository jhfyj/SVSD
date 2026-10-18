import { EnvelopeSimple, Note, QuestionMark, type Icon } from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import type { DropKind } from "@/lib/radio/drops";
import { cn } from "./cn";

/*
  Something left on the road, on the map. A circle, because circles are content and squares are
  people (DESIGN.md §3), in its kind's colour with an icon that says what it is: a question mark
  for a question, an envelope for a story, a note for a tip.
*/

export const DROP_ICON: Record<DropKind, Icon> = { question: QuestionMark, story: EnvelopeSimple, tip: Note };

const BG: Record<DropKind, string> = { question: "bg-question", story: "bg-story", tip: "bg-tip" };
const RING: Record<DropKind, string> = { question: "border-question", story: "border-story", tip: "border-tip" };

export function DropPin({
  kind,
  label,
  land = false,
  className,
  style,
}: {
  kind: DropKind;
  label?: string;
  /** Play the landing: it falls onto the road, squashes, settles, and a ring ripples out once. */
  land?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const Icon = DROP_ICON[kind];
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("relative block size-[22px]", className)}
      style={style}
    >
      {land && (
        <>
          {/* Click-through: once faded they stay 6x the pin, and must never catch taps meant for what's under them. */}
          <span aria-hidden className={cn("drop-flash pointer-events-none absolute inset-0 rounded-full", BG[kind])} />
          <span aria-hidden className={cn("drop-ripple pointer-events-none absolute inset-0 rounded-full border-2", RING[kind])} />
          <span aria-hidden className={cn("drop-ripple-2 pointer-events-none absolute inset-0 rounded-full border", RING[kind])} />
        </>
      )}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full border-2 border-marker-border text-drop-ink",
          BG[kind],
          land && "drop-land",
        )}
      >
        <Icon size={12} weight="bold" aria-hidden />
      </span>
    </span>
  );
}
