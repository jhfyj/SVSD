"use client";

import { VolumeMute, VolumeUp } from "@carbon/icons-react";
import { unlock } from "cuelume";
import { cue, setSoundOn, useSoundOn } from "@/lib/sound";
import { MenuRow } from "../ui/MenuRow";

/** The app-wide sound switch, as a profile menu row. Turning it on plays a click so you hear it worked. */
export function SoundToggle() {
  const on = useSoundOn();
  return (
    <MenuRow
      icon={on ? <VolumeUp size={16} /> : <VolumeMute size={16} />}
      label={on ? "Sound: on" : "Sound: off"}
      sound={false}
      onClick={async () => {
        setSoundOn(!on);
        if (!on && (await unlock())) cue("toggle");
      }}
    />
  );
}
