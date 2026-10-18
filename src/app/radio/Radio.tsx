"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RadioIntro, RadioScreen } from "@/components/radio";
import type { CallState } from "@/components/radio/RadioLcd";
import { useSession } from "@/lib/auth/session";
import { useJourney } from "@/lib/journey/session";
import { DEMO_HANG_UP_RULE } from "@/lib/radio/hangups";
import { SAMPLE_MESSAGES } from "@/lib/radio/messages";

const CALL_STATES: CallState[] = ["off", "connecting", "connected", "lost"];

const METRES_PER_MILE = 1609.34;
const handle = (text: string | null) => (text ? (text.startsWith("@") ? text : `@${text}`) : null);

/**
 * The radio with the app's navigation wired in, so RadioScreen itself stays router-free for Storybook.
 * `?call=connecting|connected|lost` opens the radio in that state (the dial kit uses it),
 * `?outcome=lost` makes connecting end in Connection lost, and `?message=message|question` plays
 * a message left on the road straight away. For filming, `?me=NightOwl&peer=Mothlight&miles=84`
 * sets who the radio introduces and how much road you share.
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
  const kind = params.get("message");
  const message = SAMPLE_MESSAGES.find((m) => m.kind === kind);
  // You: as on your profile. Shared road: your whole drive until matching knows the other route.
  const session = useSession();
  const journey = useJourney();
  const me = handle(params.get("me")) ?? (session ? `@traveller${session.phone.slice(-4)}` : undefined);
  const peer = handle(params.get("peer")) ?? undefined;
  const tripMiles = journey?.route ? Math.max(1, Math.round(journey.route.distance / METRES_PER_MILE)) : undefined;
  const miles = Number(params.get("miles")) || tripMiles;
  return (
    <RadioIntro>
      <RadioScreen
        // A new state from the dial kit starts the radio over in it.
        key={`${state}-${outcome}-${timeout}-${kind}`}
        defaultState={state}
        outcome={outcome}
        hangUpRule={timeout ? DEMO_HANG_UP_RULE : null}
        defaultMessage={message}
        me={me}
        peer={peer}
        sharedMiles={miles}
        onPower={() => router.push("/")}
        onEndTrip={() => router.push("/trip")}
      />
    </RadioIntro>
  );
}
