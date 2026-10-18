import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { RadioScreen } from "./RadioScreen";

/**
 * The radio once you've reached your destination: the button row becomes a single End trip,
 * which opens the trip recap. Kept apart from Radio/RadioScreen so the call buttons there
 * always show.
 */
const meta = {
  title: "Radio/Finished journey",
  component: RadioScreen,
  args: { arrived: true, onEndTrip: fn(), onEndCall: fn(), onPower: fn(), onConnected: fn() },
} satisfies Meta<typeof RadioScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Arrived with the radio off: End trip in place of the buttons. */
export const Arrived: Story = {};

/** Arrived, then the switch flipped on: nobody connects, the LCD thanks you for riding. */
export const ArrivedThankYou: Story = {
  name: "Arrived, switch on",
  args: { defaultState: "thanks" },
};
