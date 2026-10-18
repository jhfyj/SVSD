"use client";

import { useState } from "react";
import { cn } from "../ui/cn";
import { Microphone, MicrophoneSlash, PhoneDisconnect, SpeakerHigh } from "@phosphor-icons/react";
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
  const [micMuted, setMicMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const on = state !== "off";

  return (
    <section aria-label="Radio" data-cuelume-theme="mech" className={cn("flex w-[351px] flex-col gap-3", className)}>
      <div className="flex items-center justify-between px-4 py-1 [background:var(--panel-gradient)]">
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase text-label/80">
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

      <div className="flex gap-2 p-3 [background:var(--panel-gradient)]">
        <HardwareButton
          className="flex-1"
          tone="end"
          disabled={state !== "connected"}
          onClick={onEndCall}
          data-cuelume-tap="close"
          data-cuelume-emphasis="strong"
        >
          <PhoneDisconnect size={24} className="opacity-80" aria-hidden />
          <span className="text-base font-bold opacity-80">END CALL</span>
        </HardwareButton>
        <HardwareButton
          className="w-[70px]"
          pressed={micMuted}
          onClick={() => setMicMuted(!micMuted)}
          aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {micMuted ? (
            <MicrophoneSlash size={24} className="opacity-60" aria-hidden />
          ) : (
            <Microphone size={24} className="opacity-60" aria-hidden />
          )}
        </HardwareButton>
        <HardwareButton
          className="w-[70px]"
          // Speakerphone: starts up (on the phone); pressed in and lit = on speaker.
          pressed={speakerOn}
          onClick={() => setSpeakerOn(!speakerOn)}
          aria-label={speakerOn ? "Turn speaker off" : "Turn speaker on"}
        >
          <SpeakerHigh size={25} className="opacity-60" aria-hidden />
        </HardwareButton>
      </div>
    </section>
  );
}
