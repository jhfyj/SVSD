"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RadioIntro, RadioScreen } from "@/components/radio";
import type { CallState } from "@/components/radio/RadioLcd";
import { STORY_DRIVE } from "@/lib/demo/storyDrive";

const CALL_STATES: CallState[] = ["off", "connecting", "connected", "lost"];

/**
 * The radio with the app's navigation wired in, so RadioScreen itself stays router-free for Storybook.
 * `?call=connecting|connected|lost` opens the radio in that state (the dial kit uses it), and
 * `?outcome=lost` makes connecting end in Connection lost. A new `?load=` value plays the load-in
 * again: the page is kept alive between visits, so without it the radio comes back already loaded.
 * `?demo=story` drives the scripted demo route (no load-in), and a new `?t=` starts it over.
 */
export function Radio() {
  const router = useRouter();
  const params = useSearchParams();
  const call = params.get("call") as CallState | null;
  const state = call && CALL_STATES.includes(call) ? call : "off";
  const outcome = params.get("outcome") === "lost" ? "lost" : "connected";
  const demo = params.get("demo") === "story" ? STORY_DRIVE : undefined;
  return (
    <RadioIntro key={params.get("load") ?? "radio"} skip={!!demo}>
      <RadioScreen
        // A new state (or a new demo run) from the dial kit starts the radio over in it.
        key={`${state}-${outcome}-${demo ? params.get("t") : ""}`}
        demo={demo}
        defaultState={state}
        outcome={outcome}
        onPower={() => router.push("/")}
        onEndTrip={() => router.push("/trip")}
      />
    </RadioIntro>
  );
}
