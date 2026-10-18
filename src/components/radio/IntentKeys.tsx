"use client";

import { CALL_INTENTS, type CallIntent } from "@/lib/radio-settings";
import { HardwareButton } from "./HardwareButton";

/**
 * The console keys while the radio asks "What are you up for?": one wide key per intent in a
 * 2 x 2 grid, in place of End call / Mic / Speaker / Settings. The remembered pick is latched
 * down (and lit). The LCD's side of it is RadioLcd's pick state.
 */
export function IntentKeys({ current, onPick }: { current?: CallIntent; onPick: (intent: CallIntent) => void }) {
  return (
    // A 2 x 2 grid of wide keys, so every label fits on one line. Two 31px rows and the gap
    // make the same 70px as the usual button row, so the console doesn't jump when they swap in.
    <div role="radiogroup" aria-label="What are you up for?" className="grid w-full grid-cols-2 gap-2">
      {CALL_INTENTS.map((t) => (
        <HardwareButton
          key={t.id}
          role="radio"
          aria-checked={t.id === current}
          aria-label={t.label}
          className="h-[31px]! px-2"
          pressed={t.id === current}
          onClick={() => onPick(t.id)}
        >
          <span className="whitespace-nowrap text-[11px] font-bold uppercase leading-none opacity-80">{t.key}</span>
        </HardwareButton>
      ))}
    </div>
  );
}
