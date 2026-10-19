"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { PixelGlyph } from "@/components/drops/VoxelIcon";
import { CharacterSprite } from "@/components/profile/CharacterSprite";
import { cn } from "@/components/ui/cn";
import type { CharacterId } from "@/lib/profile/characters";
import type { DropKind } from "@/lib/radio/drops";

/*
  The first thing flow 1 shows while the app gets going: a dotted road draws itself one dot per frame,
  then a caravan travels along it from left to right, every other one a roadside character and a
  pickup (a story, a question, a tip), hopping as they go. The road and the caravan stay inside the
  screen's side margins (DESIGN.md §5.2): the caravan slides into view at the left margin and out
  of view at the right one. Then it fades and hands over. The road and the caravan step
  (DESIGN.md §9); only the fade eases out. Tap to skip. Reduced motion: the caravan standing still
  in the middle of the road, held for a moment.
*/

/** ms from mount: when each part of the moment starts. */
const AT = {
  road: 200,
  caravan: 450,
  out: 3950,
  next: 4190,
};
const STILL_MS = 1600;

const DOTS = 21;
const DOT_MS = 35;

/** The caravan, front to back: every other one a roadside character, then a pickup. */
const CARAVAN: ({ character: CharacterId } | { pickup: DropKind })[] = [
  { character: "raccoon" },
  { pickup: "story" },
  { character: "fox" },
  { pickup: "question" },
  { character: "rabbit" },
  { pickup: "tip" },
];

const at = (ms: number) => ({ "--at": `${ms}ms` }) as CSSProperties;

export function TuningIn({ next = "/overview?step=1" }: { next?: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const gone = useRef(false);

  const go = useCallback(() => {
    if (gone.current) return;
    gone.current = true;
    router.replace(next);
  }, [router, next]);

  useEffect(() => {
    router.prefetch(next);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(go, STILL_MS);
      return () => clearTimeout(t);
    }
    const timers = [setTimeout(() => setLeaving(true), AT.out), setTimeout(go, AT.next)];
    return () => timers.forEach(clearTimeout);
  }, [router, next, go]);

  return (
    <button
      type="button"
      onClick={go}
      aria-label="Caravan is loading. Tap to skip."
      className={cn(
        "grain relative flex w-full flex-1 cursor-pointer flex-col justify-center bg-background px-edge pb-edge-bottom text-foreground",
        leaving && "tune-out",
      )}
    >
      {/* The road, inside the side margins; anything past its ends is out of sight. */}
      <div className="tune-road relative h-16 w-full overflow-hidden" aria-hidden>
        <div className="absolute inset-x-0 bottom-2 flex justify-between">
          {Array.from({ length: DOTS }, (_, i) => (
            <span key={i} className="tune-dot size-1.5 rounded-full bg-foreground/40" style={at(AT.road + i * DOT_MS)} />
          ))}
        </div>
        {/* Laid out back to front, so the first one (the raccoon) leads the way to the right. */}
        <div className="tune-march absolute bottom-4 flex flex-row-reverse items-end gap-2" style={at(AT.caravan)}>
          {CARAVAN.map((c) =>
            "character" in c ? (
              <CharacterSprite key={c.character} character={c.character} pixel={2} className="text-foreground" />
            ) : (
              <PixelGlyph key={c.pickup} kind={c.pickup} px={2} />
            ),
          )}
        </div>
      </div>
    </button>
  );
}
