import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Overview } from "./Overview";

const meta = {
  title: "Onboarding/Overview",
  component: Overview,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Overview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Stories: Story = { args: { step: 1 } };
export const Company: Story = { args: { step: 2 } };
export const Anonymous: Story = { args: { step: 3 } };
