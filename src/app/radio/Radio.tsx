"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { INTRO_MS, RadioIntro, RadioScreen } from "@/components/radio";
import type { CallState } from "@/components/radio/RadioLcd";
import { useSession } from "@/lib/auth/session";
import { useJourney } from "@/lib/journey/session";
import { DEMO_HANG_UP_RULE } from "@/lib/radio/hangups";
import { SAMPLE_MESSAGES } from "@/lib/radio/messages";
import { COMPANY_DRIVE, QUESTION_DRIVE, STORY_DRIVE } from "@/lib/demo/storyDrive";
import { useCharacter } from "@/lib/profile/avatar";
import { DEFAULT_CHARACTER } from "@/lib/profile/characters";
import { NIGHT_CLOCK, NIGHT_STARTS, type NightStart } from "@/lib/radio/nightDrive";
import { setThemeChoice } from "@/lib/theme";

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
 * `?demo=story&load=` plays the radio load-in, holds on the route for three seconds, then starts
 * the scripted story-unlock drive. A new `?t=` starts it over.
 * `?night=fall|checkin|rest` plays Night mode (Flow 6) from sunset, the check-in or the rest area
 * (no load-in, nothing else on the road); a new `?t=` starts it over. Sunset ends by pinning the
 * night theme, as the dial kit's theme switch would.
 * Plain `/radio` or `/radio?sim` (a new journey, the dial kit's load-in, Tracking the road) opens on
 * Start journey; the others above open mid-drive, already started.
 */
export function Radio() {
  const router = useRouter();
  const params = useSearchParams();
  const call = params.get("call") as CallState | null;
  const state = call && CALL_STATES.includes(call) ? call : "off";
  const outcome = params.get("outcome") === "lost" ? "lost" : "connected";
  const timeout = params.get("timeout") === "on";
  const kind = params.get("message");
  const companyDemo = params.get("demo") === "company";
  const questionDemo = params.get("demo") === "question";
  const storyDemo = params.get("demo") === "story";
  const message = SAMPLE_MESSAGES.find((m) => m.kind === kind);
  // ?messages=off: nothing on the road comes in (the dial kit's Planting your answer, where you leave your own).
  const quiet = params.get("messages") === "off";
  // You: as on your profile. Shared road: your whole drive until matching knows the other route.
  const session = useSession();
  const journey = useJourney();
  const me = companyDemo || storyDemo ? "@NightOwl" : handle(params.get("me")) ?? (session ? `@traveller${session.phone.slice(-4)}` : undefined);
  const peer = companyDemo ? "@Mothlight" : handle(params.get("peer")) ?? undefined;
  const tripMiles = journey?.route ? Math.max(1, Math.round(journey.route.distance / METRES_PER_MILE)) : undefined;
  const miles = Number(params.get("miles")) || tripMiles;
  const demo =
    companyDemo
      ? COMPANY_DRIVE
      : questionDemo
      ? QUESTION_DRIVE
      : storyDemo
      ? { ...STORY_DRIVE, startDelayMs: (params.has("load") ? INTRO_MS : 0) + 3000 }
      : undefined;
  const nightParam = params.get("night") as NightStart | null;
  const night = nightParam && NIGHT_STARTS.includes(nightParam) ? nightParam : undefined;
  const meCharacter = useCharacter(session?.phone) ?? DEFAULT_CHARACTER;
  const midDrive = ["call", "message", "messages", "timeout", "arrived", "demo", "night"].some((k) => params.has(k));
  return (
    <RadioIntro key={params.get("load") ?? "radio"} skip={!!night || (!!demo && !params.has("load"))}>
      <RadioScreen
        // A new state (or a new demo run) from the dial kit starts the radio over in it.
        key={`${state}-${outcome}-${timeout}-${kind}-${quiet}-${params.get("sim")}-${demo || night ? params.get("t") : ""}-${night}`}
        demo={demo}
        night={night}
        time={night ? NIGHT_CLOCK[night] : undefined}
        onNightfall={() => setThemeChoice("dark")}
        meCharacter={meCharacter}
        companyDemo={companyDemo}
        questionDemo={questionDemo}
        storyDemo={storyDemo}
        defaultState={state}
        // The story-unlock demo has its own story on the road, and Night mode talks to you itself;
        // nothing else comes in during either.
        messages={quiet || demo || night ? [] : undefined}
        outcome={outcome}
        hangUpRule={timeout ? DEMO_HANG_UP_RULE : null}
        defaultMessage={message}
        me={me}
        peer={peer}
        peerCharacter={companyDemo ? "rabbit" : undefined}
        sharedMiles={miles}
        // A new journey opens on Start journey (plain ?sim too: press it and the demo drive sets off).
        // Every other dial kit moment (a call state, a message, the demo, Night mode) is mid-drive.
        started={midDrive}
        onEndTrip={() => router.push("/trip")}
      />
    </RadioIntro>
  );
}
