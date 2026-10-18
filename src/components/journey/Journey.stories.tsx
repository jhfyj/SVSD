import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { IntentPicker } from "./IntentPicker";
import { JourneyMap } from "./JourneyMap";
import { JourneySetup } from "./JourneySetup";
import { RouteTrail } from "./RouteTrail";
import { StartJourney } from "./StartJourney";
import type { MessyLook } from "./MessyText";
import { StartingRadio } from "./StartingRadio";
import { TuningStrip } from "./TuningStrip";

/** The "getting set up" flow (Figma iPhone 16 - 50 to 58). */
const meta: Meta = { title: "Journey", parameters: { layout: "centered" } };
export default meta;

/** A drive from Union Square to 1 Irving Pl and on east, for the trail stories. */
const SAMPLE_ROUTE = [
  [40.7359, -73.9911], [40.7372, -73.9895], [40.7352, -73.985], [40.7365, -73.983],
  [40.7346, -73.979], [40.733, -73.975], [40.7302, -73.972], [40.728, -73.9715],
].map(([lat, lng]) => ({ lat, lng }));

export const Start: StoryObj = { render: () => <StartJourney href="#" /> };

/** What brings you here today: pick one intent, then Next opens trip setup. */
export const Intents: StoryObj = { render: () => <IntentPicker href="#" /> };

/** Asks for your location; searches and routes against the live OpenStreetMap services. */
export const Setup: StoryObj = { render: () => <JourneySetup /> };

/** The splash after Start journey; it stays put here instead of opening the radio. */
export const Starting: StoryObj = { render: () => <StartingRadio /> };

export const SetupDuration: StoryObj = { render: () => <JourneySetup initialTab="Duration" /> };

function DurationStory({ look }: { look?: MessyLook }) {
  const [minutes, setMinutes] = useState(50);
  return (
    <div className="w-[393px] bg-background py-6">
      <TuningStrip minutes={minutes} onChange={setMinutes} look={look} />
    </div>
  );
}

/** Trip length, 5 min to 24 hr: drag, flick, or use the arrow keys. Tap the time to type one. */
export const Duration: StoryObj = { render: () => <DurationStory /> };

/* Workshop: rougher takes on the time readout, all in the foreground color. */

/** Each digit leans and sits a little off the line. */
export const DurationJitter: StoryObj = { name: "Duration / Jitter", render: () => <DurationStory look="jitter" /> };

/** Printed twice, slightly off-register. */
export const DurationMisprint: StoryObj = { name: "Duration / Misprint", render: () => <DurationStory look="misprint" /> };

/** Ransom note: every glyph picks its own face and size. */
export const DurationMixed: StoryObj = { name: "Duration / Mixed type", render: () => <DurationStory look="mixed" /> };

/** Scribbled: big lean and size swings. */
export const DurationScrawl: StoryObj = { name: "Duration / Scrawl", render: () => <DurationStory look="scrawl" /> };

export const Trail: StoryObj = {
  render: () => (
    <div className="w-[305px] bg-background">
      <RouteTrail points={SAMPLE_ROUTE} stories={24} questions={6} />
    </div>
  ),
};

export const EarthMap: StoryObj = {
  render: () => (
    <div className="w-[393px] bg-background">
      <JourneyMap here={{ lat: 40.7359, lng: -73.9911 }} destination={null} route={null} />
    </div>
  ),
};

/** Toggle the route to watch the map zoom from the earth into the trail and back. */
export const EarthToTrail: StoryObj = {
  render: function Render() {
    const [on, setOn] = useState(false);
    return (
      <div className="flex w-[393px] flex-col gap-4 bg-background py-4">
        <JourneyMap
          here={SAMPLE_ROUTE[0]}
          destination={SAMPLE_ROUTE[SAMPLE_ROUTE.length - 1]}
          route={on ? SAMPLE_ROUTE : null}
          stories={24}
          questions={6}
        />
        <button type="button" onClick={() => setOn(!on)} className="mx-auto border border-border px-3 py-2 text-xs uppercase">
          {on ? "Zoom out" : "Zoom in"}
        </button>
      </div>
    );
  },
};
