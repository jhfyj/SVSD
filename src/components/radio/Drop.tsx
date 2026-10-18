"use client";

import type { ReactNode } from "react";
import { DROP_LABEL, type DropKind } from "@/lib/radio/drops";
import { DROP_ICON, DropPin } from "../ui/DropPin";
import type { DropControls } from "./useDrop";

/** "00:07", "01:32": a recorder's counter, minutes and seconds, counting up. */
const formatElapsed = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/*
  What a drop looks like on the radio. It's built on Angelina's route messages: the LCD reads like
  her reply recorder (a blinking dot, a counter going up), and your voice rises from the bottom of the map
  in your colour. Once it's dropped it lands on the map as a pin with what it became: a question
  mark, an envelope for a story, or a note for a tip.
*/

/** The LCD while you drop something: recording, sorting, then what it became. */
export function DropLcd({ controls }: { controls: DropControls }) {
  const { phase, elapsed, sendsIn, last } = controls;
  if (phase === "recording") {
    return (
      <Lcd>
        <span className="flex items-center gap-2 text-[11px]">
          {/* A 6px square: the drop's pixel, a touch shorter than the 11px caps so it sits under the text, not over it. */}
          <span aria-hidden className="caret-blink size-[6px] shrink-0 bg-current" />
          YOUR DROP
        </span>
        {elapsed === null ? (
          <span className="mt-1 block text-[11px] normal-case">Waiting for the mic…</span>
        ) : (
          // Counts up like a recorder, no limit: 00:00, 00:01…
          <span className="mt-1 block text-[28px] leading-none tabular-nums">{formatElapsed(elapsed)}</span>
        )}
        <span className="mt-1.5 block text-[11px] normal-case">
          {/* Gone quiet: say when it sends itself. Talking again takes it back to the tap hint. */}
          {sendsIn === null ? "Tap send or stop speaking for 10 sec" : `Sending in ${Math.ceil(sendsIn / 1000)}…`}
        </span>
      </Lcd>
    );
  }
  if (phase === "sorting") {
    return (
      <Lcd>
        SORTING
        <span aria-hidden className="lcd-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </Lcd>
    );
  }
  if (phase === "dropped" && last) {
    const Icon = DROP_ICON[last.kind];
    return (
      <Lcd>
        <span className="flex items-start gap-2 text-[20px] font-medium leading-[1.2]">
          <Icon size={22} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
          <span>
            {DROP_LABEL[last.kind]}
            <br />
            dropped
          </span>
        </span>
        <span className="mt-2 block text-[11px] normal-case">The next driver here will hear it</span>
      </Lcd>
    );
  }
  if (phase === "empty") {
    return (
      <Lcd>
        NOTHING HEARD
        <span className="mt-1 block text-[11px] normal-case">Tap the pin and talk to leave a drop</span>
      </Lcd>
    );
  }
  if (phase === "noMic") {
    return (
      <Lcd>
        MIC IS OFF
        <span className="mt-1 block text-[11px] normal-case">Allow the mic to leave a drop</span>
      </Lcd>
    );
  }
  return null;
}

function Lcd({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="w-full px-[19px] text-left font-mono text-[14px] uppercase leading-tight text-lcd-ink">
      {children}
    </p>
  );
}

/**
 * On the placeholder map nothing drives, so a new drop lands beside you, then slides back along
 * the route and out of the bottom of the screen, the way the road would carry it away behind the car.
 */
export function LeftBehind({ kind, from }: { kind: DropKind; from: { x: number; y: number } }) {
  return (
    <span className="drop-left-behind absolute -translate-x-1/2 -translate-y-1/2" style={{ left: from.x, top: from.y }}>
      <DropPin kind={kind} label={`${DROP_LABEL[kind]} you dropped`} land />
    </span>
  );
}
