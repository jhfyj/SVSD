import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SAMPLE_TRIP, tripEvents } from "@/lib/trip/trip";
import { TripMap } from "./TripMap";
import { TripSummary } from "./TripSummary";

/** The end of a trip: End trip on the radio opens this recap. */
const meta: Meta = { title: "Trip", parameters: { layout: "centered" } };
export default meta;

const trip = tripEvents(SAMPLE_TRIP);

/** San Francisco to Santa Cruz: the route with its questions pinned, the summary, the questions and the call. */
export const Summary: StoryObj = { render: () => <TripSummary trip={trip} doneHref="#" /> };

/** A longer drive: six questions and two calls. */
export const LongDrive: StoryObj = {
  render: () => <TripSummary trip={tripEvents({ ...SAMPLE_TRIP, to: "Los Angeles", minutes: 380, miles: 383 })} doneHref="#" />,
};

/** A short hop where nothing came up. */
export const QuietTrip: StoryObj = {
  render: () => <TripSummary trip={{ ...tripEvents({ ...SAMPLE_TRIP, minutes: 5 }), questions: [], calls: [] }} doneHref="#" />,
};

/** Just the map: magenta squares are questions (numbered as in the list), sky dots the stretch shared on a call. */
export const Map: StoryObj = {
  render: () => (
    <div className="w-[331px] bg-background p-4 text-foreground">
      <TripMap trip={trip} />
    </div>
  ),
};
