import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SAMPLE_TRIP, tripEvents } from "@/lib/trip/trip";
import { TripMap } from "./TripMap";
import { TripQuestions } from "./TripQuestions";
import { TripSummary } from "./TripSummary";

/** The end of a trip: End trip on the radio opens this recap. */
const meta: Meta = { title: "Trip", parameters: { layout: "centered" } };
export default meta;

const trip = tripEvents(SAMPLE_TRIP);

/** San Francisco to Santa Cruz: the route with its questions pinned, the summary, the questions and the call. */
export const Summary: StoryObj = { render: () => <TripSummary trip={trip} doneHref="#" /> };

const longDrive = tripEvents({ ...SAMPLE_TRIP, to: "Los Angeles", minutes: 380, miles: 383 });

/** A longer drive: six questions and two calls. Past three questions the recap shows the first three and View all. */
export const LongDrive: StoryObj = {
  render: () => <TripSummary trip={longDrive} doneHref="#" allQuestionsHref="?path=/story/trip--all-questions" />,
};

/** View all: every question from the long drive, with the time each came up and how far into the drive. */
export const AllQuestions: StoryObj = {
  name: "All questions",
  render: () => <TripQuestions trip={{ ...longDrive, startedAt: new Date(2026, 9, 18, 14, 5).getTime() }} backHref="#" />,
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
