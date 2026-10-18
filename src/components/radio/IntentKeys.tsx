"use client";

import { CALL_INTENTS, type CallIntent } from "@/lib/radio-settings";
import { HardwareButton } from "./HardwareButton";

/**
 * The console keys while the radio asks "What are you up for?": one wide key per intent in a
 * 2 x 2 grid, in place of End call / Mic / Speaker / Settings. The remembered pick is latched
 * down (and lit).
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

/** What the LCD says while you pick. */
export function IntentPrompt({ keeping }: { keeping?: string }) {
  return (
    <p role="status" className="px-3 text-center font-mono uppercase leading-tight text-lcd-ink">
      <span className="block text-[14px]">What are you up for?</span>
      <span className="mt-1.5 block text-[11px] normal-case">
        {keeping ? `Keeping "${keeping}" in 3 s` : "Helps us find your match"}
      </span>
    </p>
  );
}
