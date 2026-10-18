"use client";

import { useState } from "react";
import { cn } from "../ui/cn";
import { MicIcon, SpeakerIcon } from "../ui/icons";
import { HardwareButton } from "./HardwareButton";
import { LcdScreen, PixelMascot } from "./LcdScreen";
import { Led } from "./Led";
import { ToggleSwitch } from "./ToggleSwitch";

export type RadioState = "off" | "starting" | "connecting" | "connected";

export type RadioConsoleProps = {
  state: RadioState;
  frequency?: string;
  onPower?: (on: boolean) => void;
  onEndCall?: () => void;
  className?: string;
};

/** The sync-calling radio: top bar with switch and LED, LCD display, bottom console. */
export function RadioConsole({ state, frequency = "89.9", onPower, onEndCall, className }: RadioConsoleProps) {
  const [mic, setMic] = useState(true);
  const [speaker, setSpeaker] = useState(true);
  const on = state !== "off";

  return (
    <section aria-label="Radio" className={cn("flex w-[329px] flex-col gap-3", className)}>
      <div className="flex items-center justify-between px-4 py-1 [background:var(--panel-gradient)]">
        <span className="flex items-center gap-2 text-[13px] font-bold uppercase text-label/80">
          <Led on={state === "connected"} /> Radio
        </span>
        <ToggleSwitch on={on} onChange={(v) => onPower?.(v)} />
      </div>

      <LcdScreen className={cn("h-40 flex-col gap-2", !on && "brightness-50")}>
        {state === "starting" && <span className="font-display text-5xl">{frequency}</span>}
        {state === "connecting" && <span className="text-sm uppercase">Connecting…</span>}
        {state === "connected" && (
          <>
            <PixelMascot size={6} />
            <span className="font-display text-xl">{frequency} FM</span>
          </>
        )}
      </LcdScreen>

      <div className="grid grid-cols-2 gap-2 p-3 [background:var(--panel-gradient)]">
        <HardwareButton className="col-span-2" tone="end" disabled={state !== "connected"} onClick={onEndCall}>
          End call
        </HardwareButton>
        <HardwareButton pressed={mic} onClick={() => setMic(!mic)} aria-label="Microphone">
          <MicIcon /> Mic
        </HardwareButton>
        <HardwareButton pressed={speaker} onClick={() => setSpeaker(!speaker)} aria-label="Speaker">
          <SpeakerIcon /> Speaker
        </HardwareButton>
      </div>
    </section>
  );
}
