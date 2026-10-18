import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabBar } from "./TabBar";

const meta: Meta<typeof TabBar> = {
  title: "Components/TabBar",
  component: TabBar,
  decorators: [
    (Story) => (
      <div className="flex h-[200px] w-[393px] flex-col justify-end bg-background">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof TabBar>;

export const NewJourney: Story = { args: { current: "journey" } };
export const History: Story = { args: { current: "history" } };
export const Profile: Story = { args: { current: "profile" } };
