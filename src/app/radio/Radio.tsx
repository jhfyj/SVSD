"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RadioIntro, RadioScreen } from "@/components/radio";
import type { CallState } from "@/components/radio/RadioLcd";
import { useSession } from "@/lib/auth/session";
import { useJourney } from "@/lib/journey/session";
import { DEMO_HANG_UP_RULE } from "@/lib/radio/hangups";
import { SAMPLE_MESSAGES } from "@/lib/radio/messages";
import { STORY_DRIVE } from "@/lib/demo/storyDrive";

const CALL_STATES: CallState[] = ["off", "pick", "connecting", "connected", "lost"];

const METRES_PER_MILE = 1609.34;
const handle = (text: string | null) => (text ? (text.startsWith("@") ? text : `@${text}`) : null);

/**
 * The radio with the app's navigation wired in, so RadioScreen itself stays router-free for Storybook.
 * `?call=pick|connecting|connected|lost` opens the radio in that state (the dial kit uses it;
 * pick is the switch just flipped on, waiting for an intent),
 * `?outcome=lost` makes connecting end in Connection lost, and `?message=message|question` plays
 * a message left on the road straight away. For filming, `?me=NightOwl&peer=Mothlight&miles=84`
 * sets who the radio introduces and how much road you share.
 * `?timeout=on` is the dial kit's Hang-up timeout flow: 3 hang-ups within a minute = a 20-second
 * break. Without it hang-ups don't count, so trying other things never locks you out.
 * `?messages=off&sim` is Planting your answer: nothing comes in, and the map drives the demo route.
 * A new `?load=` value plays the load-in again: the page is kept alive between visits, so without
 * it the radio comes back already loaded.
 * `?demo=story` drives the scripted story-unlock drive (no load-in), and a new `?t=` starts it over.
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
  // ?messages=off: nothing on the road comes in (the dial kit's Planting your answer, where you leave your own).
  const quiet = params.get("messages") === "off";
  // You: as on your profile. Shared road: your whole drive until matching knows the other route.
  const session = useSession();
  const journey = useJourney();
  const me = handle(params.get("me")) ?? (session ? `@traveller${session.phone.slice(-4)}` : undefined);
  const peer = handle(params.get("peer")) ?? undefined;
  const tripMiles = journey?.route ? Math.max(1, Math.round(journey.route.distance / METRES_PER_MILE)) : undefined;
  const miles = Number(params.get("miles")) || tripMiles;
  const demo = params.get("demo") === "story" ? STORY_DRIVE : undefined;
  return (
    <RadioIntro key={params.get("load") ?? "radio"} skip={!!demo}>
      <RadioScreen
        // A new state (or a new demo run) from the dial kit starts the radio over in it.
        key={`${state}-${outcome}-${timeout}-${kind}-${quiet}-${params.get("sim")}-${demo ? params.get("t") : ""}`}
        demo={demo}
        defaultState={state}
        // The story-unlock demo has its own story on the road; nothing else comes in during it.
        messages={quiet || demo ? [] : undefined}
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
