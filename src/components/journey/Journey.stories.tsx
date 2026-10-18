import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { JourneySetup } from "./JourneySetup";
import { RouteTrail } from "./RouteTrail";
import { StartJourney } from "./StartJourney";
import { TuningStrip } from "./TuningStrip";
import { WorldDotMap } from "./WorldDotMap";

/** The "getting set up" flow (Figma iPhone 16 - 50 to 58). */
const meta: Meta = { title: "Journey", parameters: { layout: "centered" } };
export default meta;

/** A walk from Union Square to 1 Irving Pl and on east, for the trail stories. */
const SAMPLE_ROUTE = [
  [40.7359, -73.9911], [40.7372, -73.9895], [40.7352, -73.985], [40.7365, -73.983],
  [40.7346, -73.979], [40.733, -73.975], [40.7302, -73.972], [40.728, -73.9715],
].map(([lat, lng]) => ({ lat, lng }));

export const Start: StoryObj = { render: () => <StartJourney href="#" /> };

/** Asks for your location; searches and routes against the live OpenStreetMap services. */
export const Setup: StoryObj = { render: () => <JourneySetup /> };

export const SetupDuration: StoryObj = { render: () => <JourneySetup initialTab="Duration" /> };

/** Trip length, 5 min to 8 hr: drag, flick, or use the arrow keys. */
export const Duration: StoryObj = {
  render: function Render() {
    const [minutes, setMinutes] = useState(50);
    return (
      <div className="w-[393px] bg-background py-6">
        <TuningStrip minutes={minutes} onChange={setMinutes} />
      </div>
    );
  },
};

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
      <WorldDotMap pins={[{ id: "you", tone: "you", lat: 40.73, lng: -73.99 }]} centerLng={50} />
    </div>
  ),
};
