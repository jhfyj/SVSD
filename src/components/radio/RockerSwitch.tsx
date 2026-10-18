"use client";

import { useState } from "react";
import { cn } from "../ui/cn";

export type RockerSwitchProps = {
  on: boolean;
  onChange: (on: boolean) => void;
  label?: string;
  className?: string;
};

/**
 * The vertical power slider from the radio console (built to replace the photo in Figma).
 * A recessed black housing holds a track marked O (off) at the top and | (on) below it;
 * a brushed-metal knob sits at the bottom when on and slides to the top when off.
 */
export function RockerSwitch({ on, onChange, label = "Radio power", className }: RockerSwitchProps) {
  const [held, setHeld] = useState(false);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      onPointerDown={() => setHeld(true)}
      onPointerUp={() => setHeld(false)}
      onPointerLeave={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
      className={cn(
        "relative h-[98px] w-[46px] touch-manipulation select-none bg-[#0b0b0b] p-[5px]",
        "shadow-[inset_0_2px_3px_rgb(0_0_0/0.9),0_1px_0_rgb(255_255_255/0.08)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        className,
      )}
    >
      {/* Track */}
      <span className="relative flex h-full w-full flex-col items-center bg-[linear-gradient(180deg,#141414_0%,#1d1d1d_100%)] shadow-[inset_0_3px_6px_rgb(0_0_0/0.9)]">
        <span
          aria-hidden
          className={cn(
            "mt-[13px] size-[13px] rounded-full border-2 transition-colors",
            on ? "border-[#8a8a8a]" : "border-[#d8d8d8] shadow-[0_0_4px_rgb(255_255_255/0.35)]",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "mt-[19px] h-[9px] w-[2px] transition-colors",
            on ? "bg-[#d8d8d8] shadow-[0_0_4px_rgb(255_255_255/0.35)]" : "bg-[#8a8a8a]",
          )}
        />
        {/* Knob */}
        <span
          aria-hidden
          className={cn(
            "absolute left-[2px] right-[2px] h-[17px] transition-[top,filter,box-shadow] duration-150 ease-out",
            "bg-[linear-gradient(180deg,#e9e9e9_0%,#bdbdbd_45%,#8f8f8f_100%)]",
            held
              ? "brightness-90 shadow-[inset_0_2px_3px_rgb(0_0_0/0.45),0_1px_1px_rgb(0_0_0/0.6)]"
              : "shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_3px_4px_rgb(0_0_0/0.8)]",
            on ? "top-[calc(100%-21px)]" : "top-[4px]",
          )}
        />
      </span>
    </button>
  );
}
