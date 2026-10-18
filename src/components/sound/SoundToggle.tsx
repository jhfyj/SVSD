"use client";

import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { unlock } from "cuelume";
import { cue, setSoundOn, useSoundOn } from "@/lib/sound";
import { MenuRow } from "../ui/MenuRow";

/** The app-wide sound switch, as a profile menu row. Turning it on plays a click so you hear it worked. */
export function SoundToggle() {
  const on = useSoundOn();
  return (
    <MenuRow
      icon={on ? <SpeakerHigh size={16} aria-hidden /> : <SpeakerSlash size={16} aria-hidden />}
      label={on ? "Sound: on" : "Sound: off"}
      onClick={async () => {
        setSoundOn(!on);
        if (!on && (await unlock())) cue("toggle");
      }}
    />
  );
}
