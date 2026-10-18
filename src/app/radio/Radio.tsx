"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RadioIntro, RadioScreen } from "@/components/radio";
import type { CallState } from "@/components/radio/RadioLcd";
import { DEMO_HANG_UP_RULE } from "@/lib/radio/hangups";

const CALL_STATES: CallState[] = ["off", "connecting", "connected", "lost"];

/**
 * The radio with the app's navigation wired in, so RadioScreen itself stays router-free for Storybook.
 * `?call=connecting|connected|lost` opens the radio in that state (the dial kit uses it), and
 * `?outcome=lost` makes connecting end in Connection lost.
 * `?timeout=on` is the dial kit's Hang-up timeout flow: 3 hang-ups within a minute = a 20-second
 * break. Without it hang-ups don't count, so trying other things never locks you out.
 */
export function Radio() {
  const router = useRouter();
  const params = useSearchParams();
  const call = params.get("call") as CallState | null;
  const state = call && CALL_STATES.includes(call) ? call : "off";
  const outcome = params.get("outcome") === "lost" ? "lost" : "connected";
  const timeout = params.get("timeout") === "on";
  return (
    <RadioIntro>
      <RadioScreen
        // A new state from the dial kit starts the radio over in it.
        key={`${state}-${outcome}-${timeout}`}
        defaultState={state}
        outcome={outcome}
        hangUpRule={timeout ? DEMO_HANG_UP_RULE : null}
        onPower={() => router.push("/")}
        onEndTrip={() => router.push("/trip")}
      />
    </RadioIntro>
  );
}
