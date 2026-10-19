import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { FlowPicker } from "./DialKit";

const FLOWS = [
  { n: "1", title: "Intro to Caravan" },
  { n: "2", title: "Stories on the road" },
  { n: "3", title: "Company: one stranger" },
  { n: "4", title: "Answer a question" },
  { n: "5", title: "Your drive becomes a story" },
  { n: "6", title: "Night mode" },
];

/**
 * The only prototype control on the hosted site: hold two fingers on the screen (or press ` on a
 * keyboard) and the six flows appear along the bottom. Tap a number to start that flow from its
 * first screen; tap anywhere else, or hold two fingers again, to hide it.
 */
const meta = {
  title: "Dial kit/Flow picker",
  component: FlowPicker,
  args: { flows: FLOWS, onPick: fn(), onClose: fn() },
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div className="relative h-[852px] w-[393px] bg-backdrop">{Story()}</div>],
} satisfies Meta<typeof FlowPicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Showing: Story = {};
