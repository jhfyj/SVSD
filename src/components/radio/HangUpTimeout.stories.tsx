import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { clearHangUps } from "@/lib/radio/hangups";
import { RadioScreen } from "./RadioScreen";

/**
 * Hang up on too many people in a row and the radio takes a break. The app's rule is
 * 3 hang-ups within 2 minutes = 5 minutes off the air; this story uses short numbers
 * (3 within 1 minute = 20 seconds) so it's quick to try. Hit End call three times.
 */
const meta: Meta<typeof RadioScreen> = {
  title: "Radio/Hang-up timeout",
  component: RadioScreen,
  parameters: { layout: "centered" },
  args: { onEndCall: fn(), onPower: fn() },
};
export default meta;

type Story = StoryObj<typeof RadioScreen>;

export const ThreeHangUps: Story = {
  name: "Three hang-ups, then a timeout",
  render: function Render(args) {
    // Each visit starts clean, so earlier tries don't leave you timed out.
    useState(clearHangUps);
    return (
      <RadioScreen
        {...args}
        arrived={false}
        defaultState="connected"
        connectMs={1500}
        hangUpRule={{ limit: 3, windowMs: 60_000, timeoutMs: 20_000 }}
      />
    );
  },
};
