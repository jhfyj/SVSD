"use client";

import { useEffect, useState } from "react";
import { Led } from "@/components/radio/Led";
import { LcdScreen } from "@/components/radio/LcdScreen";
import { RadioLcd } from "@/components/radio/RadioLcd";
import { RockerSwitch } from "@/components/radio/RockerSwitch";
import { NavMap } from "@/components/nav/NavMap";
import { CharacterSprite } from "@/components/profile/CharacterSprite";
import { CHARACTERS } from "@/lib/profile/characters";
import { headingAt, measure, offset, pointAt } from "@/lib/nav/path";
import { STORY_DRIVE, type DemoDrive } from "@/lib/demo/storyDrive";
import type { DropKind } from "@/lib/radio/drops";
import { cue, warmAhh } from "@/lib/sound";

const pickupPath = measure(STORY_DRIVE.route.points);
const pickupAt = (id: string, kind: DropKind, distance: number) => {
  const heading = headingAt(pickupPath, distance) ?? 90;
  return {
    id,
    kind,
    at: offset(pointAt(pickupPath, distance), heading + 90, 26),
  };
};

const STORY_OVERVIEW_DRIVE: DemoDrive = {
  ...STORY_DRIVE,
  name: "NightOwl's route",
  pickups: [
    pickupAt("overview-story", "story", 100),
    pickupAt("overview-question", "question", 215),
    pickupAt("overview-tip", "tip", 330),
  ],
};

/** Each pickup pops with the radio's payoff: a bright chime, then a warm "ahh" blooming under it. */
const chime = () => {
  cue("success", { emphasis: "strong" });
  setTimeout(warmAhh, 90);
};

/** The actual navigation map, with the three real drop types collected in sequence. */
export function StoriesScene() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-lcd">
      <NavMap
        travellers={[]}
        demo={STORY_OVERVIEW_DRIVE}
        onCollect={chime}
        fallback={<div className="absolute inset-0 bg-lcd" />}
        className="nav-map overview-lcd-map overview-story-map absolute inset-0"
      />
    </div>
  );
}

/** The real radio rocker powers up, searches, then introduces a nearby driver on its LCD. */
export function CompanyScene() {
  const [tick, setTick] = useState(0);
  const [manualOn, setManualOn] = useState<boolean | null>(null);
  const [manualConnected, setManualConnected] = useState(false);
  const phase = tick % 9;
  const autoOn = phase >= 2 && phase <= 6;
  const autoConnected = phase >= 4 && phase <= 6;
  const on = manualOn ?? autoOn;
  const connected = manualOn === null ? autoConnected : manualConnected;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTick(4);
      return;
    }
    const loop = window.setInterval(() => setTick((n) => n + 1), 850);
    return () => window.clearInterval(loop);
  }, []);

  useEffect(() => {
    if (manualOn !== true) {
      setManualConnected(false);
      return;
    }
    const timer = window.setTimeout(() => setManualConnected(true), 1300);
    return () => window.clearTimeout(timer);
  }, [manualOn]);

  return (
    <div className="overview-company-scene relative flex h-full w-full items-center justify-center gap-[clamp(16px,5vw,36px)] overflow-hidden bg-background px-5 text-foreground">
      <div className="flex shrink-0 flex-col items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/60">Company</span>
        <RockerSwitch on={on} onChange={setManualOn} label="Company radio power" />
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-foreground/60">
          <Led on={on} tone={connected ? "live" : "connecting"} blink={on && !connected} />
          {connected ? "Connected" : on ? "Searching" : "Off"}
        </div>
      </div>
      <LcdScreen className="aspect-square w-[clamp(150px,50%,220px)] shrink-0 px-3">
        {connected ? (
          <RadioLcd state="connected" greeting peer="@Mothlight" peerCharacter="rabbit" />
        ) : on ? (
          <RadioLcd state="connecting" peerCharacter="rabbit" hint="Finding someone nearby" />
        ) : (
          <RadioLcd state="off" peerCharacter="rabbit" companion="rabbit" />
        )}
      </LcdScreen>
    </div>
  );
}

/** Cycles through the real profile avatars, so the preview shows the choices in the app. */
export function AvatarsScene() {
  const [index, setIndex] = useState(0);
  const character = CHARACTERS[index];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const loop = window.setInterval(() => setIndex((n) => (n + 1) % CHARACTERS.length), 1500);
    return () => window.clearInterval(loop);
  }, []);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden bg-lcd text-lcd-ink">
      <CharacterSprite key={character.id} character={character.id} pixel={7} className="sprite-play" />
      <div className="text-center font-mono uppercase">
        <p className="text-[18px] leading-tight">{character.name}</p>
      </div>
    </div>
  );
}
