"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { CharacterId } from "@/lib/profile/characters";
import { CHECK_IN, DRIVING_TONIGHT, REST_AREA, type NightPhase } from "@/lib/radio/nightDrive";
import type { Level } from "@/lib/radio/voice";
import { CharacterSprite } from "../profile/CharacterSprite";
import { WeatherSprite } from "../journey/WeatherIcon";
import { cn } from "../ui/cn";

/*
  What Night mode looks like on the radio (Flow 6). The amber itself is only tokens
  (.radio-night in globals.css), so every radio state turns amber at night without code here, when the Night amber switch is on (off by default, lib/theme).
  This file is the moments: the sun setting, the radio relighting, the check-in on the LCD, and the reroute
  and rest stop there.
*/

type Rect = { left: number; top: number; width: number; height: number };

/** One sprite pixel of the setting sun, in px: it sinks one of these at a time. */
const SUN_PIXEL = 5;

/**
 * Sunset — the dusk phase
 *   The sun sinks across the map and below its bottom edge while the light goes amber and the
 *   whole radio dims, like dusk falling on it.
 *   travel:  the sun drops 560px in hard steps of one sprite pixel (5px), constant speed
 *   curve:   steps(112) for the sun (a pixel thing); ease-out for the light   time: DUSK_MS
 *   light:   the map takes a multiply wash of the sun's amber; the casing dims under a near-black wash
 *   sound:   none (the relight clunks)
 *   reduced: not shown; the radio goes straight to NIGHT MODE ON
 *
 * Relight — the relight phase
 *   The radio dips to black and flickers back on, already amber. The theme switches on the first,
 *   black frame, so the day radio never visibly turns into the night one.
 *   curve:   step-end (on, off, on, off)   time: RELIGHT_MS (480ms)
 *   sound:   toggle (mech, strong)
 *   reduced: not shown
 */
export function Nightfall({ phase, map }: { phase: NightPhase; map: Rect }) {
  if (phase !== "dusk" && phase !== "relight") return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {phase === "dusk" && (
        <>
          <div className="night-dusk-map absolute bg-sun mix-blend-multiply" style={map} />
          <div className="night-dusk-casing absolute inset-0 bg-nightfall mix-blend-multiply" />
          <div className="absolute overflow-hidden" style={map}>
            <WeatherSprite
              weather={{ sky: "clear", night: false }}
              pixel={SUN_PIXEL}
              className="night-sun absolute right-12 top-6 text-sun"
            />
          </div>
        </>
      )}
      {phase === "relight" && <div className="night-relight absolute inset-0 bg-nightfall" />}
    </div>
  );
}

/** What the LCD shows in Night mode, or null when Night mode has nothing to say. */
export function NightLcd({
  phase,
  level,
  character,
}: {
  phase: NightPhase;
  level: React.RefObject<Level | null>;
  character: CharacterId;
}) {
  if (phase === "nightOn") {
    return (
      <Lcd className="lcd-flash">
        <span className="block">NIGHT MODE ON</span>
        <span className="mt-1 block text-[11px] normal-case">Screen dimmed for the dark</span>
      </Lcd>
    );
  }
  if (phase === "night") {
    return (
      <Lcd>
        <span className="block">NIGHT MODE</span>
        <span className="mt-1.5 flex items-baseline justify-center gap-1.5">
          <span className="font-display text-[20px] leading-none tabular-nums">{DRIVING_TONIGHT}</span>
          <span className="text-[11px] normal-case">driving tonight</span>
        </span>
      </Lcd>
    );
  }
  if (phase === "checkin" || phase === "listening") {
    return (
      <Lcd>
        <span className="block">{CHECK_IN.title.toUpperCase()}</span>
        <span className="mt-1 block text-[11px] normal-case">{CHECK_IN.ask}</span>
        {/* Nothing to tap: the radio's listening, and says so. Kept in place while it asks, so nothing jumps. */}
        <span className={cn("mt-2.5 flex items-center justify-center gap-2 text-[11px]", phase === "checkin" && "invisible")}>
          <span aria-hidden className="caret-blink size-[6px] shrink-0 bg-current" />
          LISTENING
          <ListeningMeter level={level} on={phase === "listening"} />
        </span>
      </Lcd>
    );
  }
  // No answer: it says so, then reroutes you by itself. Nothing takes over the map; the road stays.
  if (phase === "nothing") {
    return (
      <Lcd className="lcd-flash">
        <span className="block">NOTHING HEARD</span>
        <span className="mt-1 block text-[11px] normal-case">Let&apos;s take a break</span>
      </Lcd>
    );
  }
  if (phase === "rerouting") {
    return (
      <Lcd>
        <span className="block">REROUTING</span>
        <span className="mt-1 block text-[11px] normal-case">Rest area in {REST_AREA.miles} mi · stories paused</span>
      </Lcd>
    );
  }
  if (phase === "stopped") {
    return (
      <figure role="status" className="flex flex-col items-center gap-2 text-lcd-ink">
        <Dozing character={character} />
        {/* Kept off the LCD's edges: a long line wraps onto two balanced lines instead. */}
        <figcaption className="max-w-[170px] text-balance text-center font-mono text-[11px] leading-tight">
          {`Take ${REST_AREA.breakMinutes} min · stories wait`}
        </figcaption>
      </figure>
    );
  }
  return null;
}

function Lcd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p role="status" className={cn("px-1.5 text-center font-mono text-[14px] uppercase leading-tight text-lcd-ink", className)}>
      {children}
    </p>
  );
}

/** Bars in the meter, and how often it steps (a digital readout: hard frames, ~10 a second). */
const BARS = 9;
const METER_STEP_MS = 100;

/**
 * Your voice as 2px LCD bars (the reply recorder's waveform), newest on the right. It steps every
 * 100ms like a cheap LCD, not smoothly. Flat while you're quiet, so a slow answer reads as slow.
 */
function ListeningMeter({ level, on }: { level: React.RefObject<Level | null>; on: boolean }) {
  const [bars, setBars] = useState<number[]>(() => Array(BARS).fill(0));
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => {
      const v = level.current?.() ?? 0;
      setBars((b) => [...b.slice(1), v]);
    }, METER_STEP_MS);
    return () => clearInterval(id);
  }, [on, level]);
  return (
    <span aria-hidden className="flex h-[14px] items-center gap-[2px]">
      {bars.map((v, i) => (
        // 1 to 7 two-pixel rows: the bar grows a pixel at a time.
        <span key={i} className="w-[2px] bg-current" style={{ height: 2 * Math.max(1, Math.min(7, Math.round(v * 12))) }} />
      ))}
    </span>
  );
}

/* A 5 × 5 pixel "z". The three of them step in like the LCD's CONNECTING dots: 1, 2, 3, clear. */
const Z = ["#####", "...#.", "..#..", ".#...", "#####"];

/** Your character, dozing: held still on one frame while z's climb beside it. */
function Dozing({ character }: { character: CharacterId }) {
  return (
    // The z's hang off the head's right side without taking up room, so the character itself
    // sits centred over the line below.
    <span className="relative flex">
      <CharacterSprite character={character} pixel={3} playing={false} />
      {/* Small to big, climbing up and away from the head. */}
      <span aria-hidden className="lcd-dots absolute left-full top-[-8px] ml-1 flex items-end gap-[3px]">
        {[2, 2, 3].map((px, i) => (
          <span key={i} style={{ marginBottom: i * 6 }}>
            <svg width={5 * px} height={5 * px} viewBox="0 0 5 5" shapeRendering="crispEdges" fill="currentColor">
              {Z.flatMap((row, y) => [...row].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)))}
            </svg>
          </span>
        ))}
      </span>
    </span>
  );
}
