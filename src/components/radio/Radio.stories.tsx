import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { HardwareButton } from "./HardwareButton";
import { LcdScreen, PixelMascot } from "./LcdScreen";
import { Led } from "./Led";
import { RadioConsole } from "./RadioConsole";
import { ToggleSwitch } from "./ToggleSwitch";
import { MicIcon } from "../ui/icons";

const meta = {
  title: "Radio/RadioConsole",
  component: RadioConsole,
  args: { state: "connected", onPower: fn(), onEndCall: fn() },
  argTypes: { state: { control: "inline-radio", options: ["off", "starting", "connecting", "connected"] } },
} satisfies Meta<typeof RadioConsole>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Connected: Story = {};
export const Starting: Story = { args: { state: "starting" } };
export const Connecting: Story = { args: { state: "connecting" } };
export const Off: Story = { args: { state: "off" } };

export const Parts: Story = {
  render: function Render() {
    const [on, setOn] = useState(true);
    return (
      <div className="flex flex-col items-start gap-6">
        <div className="flex items-center gap-4"><Led on={false} /> <Led on tone="connecting" /> <Led on /> <Led on tone="error" /></div>
        <ToggleSwitch on={on} onChange={setOn} />
        <LcdScreen className="size-24 rounded-full"><PixelMascot size={5} /></LcdScreen>
        <div className="flex gap-2">
          <HardwareButton><MicIcon /> Mic</HardwareButton>
          <HardwareButton tone="end">End call</HardwareButton>
        </div>
      </div>
    );
  },
};
