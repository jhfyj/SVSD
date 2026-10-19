"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { PixelGlyph } from "@/components/drops/VoxelIcon";
import { CharacterSprite } from "@/components/profile/CharacterSprite";
import { Led } from "@/components/radio/Led";
import { LcdScreen } from "@/components/radio/LcdScreen";
import { cn } from "@/components/ui/cn";
import type { CharacterId } from "@/lib/profile/characters";
import type { DropKind } from "@/lib/radio/drops";
import { tuneIn } from "@/lib/radio/voice";

/*
  The first thing flow 1 shows while the app gets going: the radio tuning in to Caravan.
  The LED blinks amber, the LCD opens in hard frames and its dial hunts across the band (with the
  radio's static-and-whistle tuning sound), then locks ON AIR and the LED turns green. A dotted road
  draws itself one dot per frame, then a caravan comes in from the left along it, every other one a
  roadside character and a pickup (a story, a question, a tip), hopping as they go. Then it fades
  and hands over.
  Everything digital steps (DESIGN.md §9); only the light fades ease out. Tap to skip. Reduced
  motion: the finished frame, held for a moment.
*/

/** ms from mount: when each part of the moment starts. */
const AT = {
  lcd: 300,
  // Just after the dial's last step (lcd + 150 + 920), so ON AIR shows on the station it locked to.
  lock: 1450,
  road: 1500,
  caravan: 1700,
  out: 3600,
  next: 3840,
};
const STILL_MS = 1600;

/** The dial hunting for the station: big jumps first, then it settles onto the frequency. */
const DIAL = ["87.5", "91.9", "96.3", "99.1", "101.5", "103.3", "104.1", "104.5", "104.7"];
const DIAL_STEP_MS = [0, 70, 140, 220, 320, 440, 580, 740, 920];

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
  const [dial, setDial] = useState(0);
  const [locked, setLocked] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const gone = useRef(false);

  const go = useCallback(() => {
    if (gone.current) return;
    gone.current = true;
    router.replace(next);
  }, [router, next]);

  useEffect(() => {
    router.prefetch(next);
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) {
      const t = [setTimeout(() => setDial(DIAL.length - 1), 0), setTimeout(() => setLocked(true), 0), setTimeout(go, STILL_MS)];
      return () => t.forEach(clearTimeout);
    }
    const timers = [
      setTimeout(() => void tuneIn(), AT.lcd),
      ...DIAL_STEP_MS.map((ms, i) => setTimeout(() => setDial(i), AT.lcd + 150 + ms)),
      setTimeout(() => setLocked(true), AT.lock),
      setTimeout(() => setLeaving(true), AT.out),
      setTimeout(go, AT.next),
    ];
    return () => timers.forEach(clearTimeout);
  }, [router, next, go]);

  return (
    <button
      type="button"
      onClick={go}
      aria-label="Caravan is tuning in. Tap to skip."
      className={cn(
        "tune grain relative flex w-full flex-1 cursor-pointer flex-col items-center justify-center gap-9 bg-background px-edge pb-edge-bottom text-foreground",
        leaving && "tune-out",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase text-label/80">Radio</span>
        <Led on tone={locked ? "live" : "connecting"} blink={!locked} />
      </div>

      <div className="tune-lcd w-full" style={at(AT.lcd)}>
        <LcdScreen className="h-[120px] w-full flex-col gap-1 font-mono">
        <span className="flex items-baseline gap-2">
          <span className="font-display text-4xl tabular-nums">{DIAL[dial]}</span>
          <span className="text-[14px]">FM</span>
        </span>
        <span className="text-[11px] uppercase">
          {locked ? (
            "On air"
          ) : (
            <>
              Tuning in<span className="lcd-dots"><span>.</span><span>.</span><span>.</span></span>
            </>
          )}
        </span>
        </LcdScreen>
      </div>

      <div className="relative h-16 w-full" aria-hidden>
        <div className="absolute inset-x-0 bottom-2 flex justify-between">
          {Array.from({ length: DOTS }, (_, i) => (
            <span key={i} className="tune-dot size-1.5 rounded-full bg-foreground/40" style={at(AT.road + i * DOT_MS)} />
          ))}
        </div>
        {/* Comes in from off the left edge and stops in the middle of the road. */}
        <div className="tune-march absolute bottom-4 left-1/2 flex items-end gap-2" style={at(AT.caravan)}>
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
