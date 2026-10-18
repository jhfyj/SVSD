import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatusBar } from "./StatusBar";

const meta = {
  title: "Components/StatusBar",
  component: StatusBar,
  args: { time: "9:41" },
  decorators: [(S) => <div className="w-[393px]"><S /></div>],
} satisfies Meta<typeof StatusBar>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
