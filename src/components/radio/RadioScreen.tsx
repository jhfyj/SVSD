"use client";

import { Microphone, PartlyCloudyNight } from "@carbon/icons-react";
import { PhoneDisconnect, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import { MapMarker, type MarkerColor } from "../ui/MapMarker";
import { cn } from "../ui/cn";
import { HardwareButton } from "./HardwareButton";
import { LcdScreen } from "./LcdScreen";
import { Led } from "./Led";
import { PowerButton } from "./PowerButton";
import { RockerSwitch } from "./RockerSwitch";

/** Where the map sits inside the device body (the inner screen). */
const SCREEN = { left: 14, top: 64, width: 365, height: 509 };

export type Traveller = { id: string; color: MarkerColor; label: string; x: number; y: number };

/** Marker positions from the Figma frame, in device coordinates (393 × 852). */
export const DEFAULT_TRAVELLERS: Traveller[] = [
  { id: "orange", color: "orange", label: "Traveller ahead", x: 225.8, y: 87.1 },
  { id: "magenta", color: "magenta", label: "Traveller", x: 206, y: 256.1 },
  { id: "lime", color: "lime", label: "You", x: 253.6, y: 287.83 },
  { id: "sky", color: "sky", label: "Traveller behind", x: 118.84, y: 431.49 },
];

export type RadioScreenProps = {
  time?: string;
  connected?: boolean;
  travellers?: Traveller[];
  onEndCall?: () => void;
  onPower?: () => void;
  className?: string;
};

const panel = "[background:var(--panel-noise),var(--panel-gradient)] shadow-[var(--panel-highlight)]";

/** The "Connected" radio screen (Figma node 123:246): map on an inset screen above the radio console. */
export function RadioScreen({
  time = "3:30 AM",
  connected = true,
  travellers = DEFAULT_TRAVELLERS,
  onEndCall,
  onPower,
  className,
}: RadioScreenProps) {
  const [radioOn, setRadioOn] = useState(connected);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const live = radioOn && connected;

  return (
    <div
      className={cn(
        "relative h-[852px] w-[393px] overflow-hidden bg-background font-sans text-foreground",
        className,
      )}
    >
      {/* Device body, behind the inner screen */}
      <div className={cn("absolute inset-x-0 top-[52px] h-[533px]", panel)} />

      {/* Inner screen: the dithered map, recessed into the body */}
      <section
        aria-label="Route map"
        className="absolute overflow-hidden bg-[#111] shadow-[0_1px_0_rgb(255_255_255/0.12)]"
        style={SCREEN}
      >
        <Image
          src="/radio/map-dithered.png"
          alt=""
          width={393}
          height={852}
          priority
          unoptimized
          className="absolute max-w-none [image-rendering:pixelated]"
          style={{ left: -SCREEN.left, top: -SCREEN.top }}
        />
        {travellers.map((t) => (
          <MapMarker
            key={t.id}
            color={t.color}
            label={t.label}
            className="absolute"
            style={{ left: t.x - SCREEN.left, top: t.y - SCREEN.top, width: 19.8, height: 19.8 }}
          />
        ))}
        {/* Glass: inner shadow so the map reads as a screen set into the case */}
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_3px_8px_rgb(0_0_0/0.75),inset_0_0_0_1px_rgb(0_0_0/0.8)]" />
      </section>

      {/* Top bar */}
      <header className={cn("absolute inset-x-0 top-0 flex h-[52px] items-center justify-between pl-[17px] pr-[3px]", panel)}>
        <div className="flex items-center gap-1">
          <PartlyCloudyNight size={16} aria-label="Partly cloudy" />
          {/* 20px in Digital-7; the wider DSEG14 fallback is set smaller to match its width */}
          <span className="font-display text-[15px] leading-none">{time}</span>
        </div>
        <PowerButton onClick={onPower} />
      </header>

      {/* Console */}
      <div className={cn("absolute inset-x-0 top-[585px] h-[267px]", panel)}>
        <div className="absolute left-[30px] top-[20px] flex items-center gap-2">
          <span className="text-[13px] font-bold text-label/80">RADIO</span>
          <Led on={live} />
        </div>

        <RockerSwitch className="absolute left-[26px] top-[44px]" on={radioOn} onChange={setRadioOn} />
        <span className="absolute left-[81px] top-[70px] text-[13px] font-bold text-label/80">
          OFF
        </span>
        <span className="absolute left-[84px] top-[111px] text-[13px] font-bold text-label/80">
          ON
        </span>

        <LcdScreen className={cn("absolute left-[156px] top-[18px] h-[130px] w-[221px] transition-[filter]", !radioOn && "brightness-[0.55]")}>
          {radioOn && (
            <Image src="/radio/mascot.png" alt="Mascot" width={111} height={105} unoptimized className="[image-rendering:pixelated]" />
          )}
        </LcdScreen>

        <div className="absolute left-[26px] top-[166px] flex w-[351px] gap-2">
          <HardwareButton tone="end" className="flex-1" onClick={onEndCall} disabled={!live}>
            <PhoneDisconnect size={24} className="opacity-80" aria-hidden />
            <span className="text-[20px] font-bold opacity-80">END CALL</span>
          </HardwareButton>
          <HardwareButton
            className="w-[70px]"
            pressed={micMuted}
            onClick={() => setMicMuted(!micMuted)}
            aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
          >
            <Microphone size={24} className="opacity-60" aria-hidden />
          </HardwareButton>
          <HardwareButton
            className="w-[70px]"
            pressed={speakerMuted}
            onClick={() => setSpeakerMuted(!speakerMuted)}
            aria-label={speakerMuted ? "Turn speaker on" : "Turn speaker off"}
          >
            {speakerMuted ? (
              <SpeakerSlash size={25} className="opacity-60" aria-hidden />
            ) : (
              <SpeakerHigh size={25} className="opacity-60" aria-hidden />
            )}
          </HardwareButton>
        </div>
      </div>
    </div>
  );
}
