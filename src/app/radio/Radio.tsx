"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RadioIntro, RadioScreen } from "@/components/radio";
import type { CallState } from "@/components/radio/RadioLcd";
import { SAMPLE_MESSAGES } from "@/lib/radio/messages";

const CALL_STATES: CallState[] = ["off", "connecting", "connected", "lost"];

/**
 * The radio with the app's navigation wired in, so RadioScreen itself stays router-free for Storybook.
 * `?call=connecting|connected|lost` opens the radio in that state (the dial kit uses it),
 * `?outcome=lost` makes connecting end in Connection lost, and `?message=message|question` plays
 * a message left on the road straight away.
 */
export function Radio() {
  const router = useRouter();
  const params = useSearchParams();
  const call = params.get("call") as CallState | null;
  const state = call && CALL_STATES.includes(call) ? call : "off";
  const outcome = params.get("outcome") === "lost" ? "lost" : "connected";
  const kind = params.get("message");
  const message = SAMPLE_MESSAGES.find((m) => m.kind === kind);
  return (
    <RadioIntro>
      <RadioScreen
        // A new state from the dial kit starts the radio over in it.
        key={`${state}-${outcome}-${kind}`}
        defaultState={state}
        outcome={outcome}
        defaultMessage={message}
        onPower={() => router.push("/")}
        onEndTrip={() => router.push("/trip")}
      />
    </RadioIntro>
  );
}
