import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { Microphone } from "@carbon/icons-react";
import { PhoneDisconnect } from "@phosphor-icons/react";
import { HardwareButton } from "./HardwareButton";
import { PowerButton } from "./PowerButton";
import { RadioIntro } from "./RadioIntro";
import { RadioScreen } from "./RadioScreen";
import { RockerSwitch } from "./RockerSwitch";

const meta = {
  title: "Radio/RadioScreen",
  component: RadioScreen,
  args: { onEndCall: fn(), onPower: fn(), onSettings: fn(), onConnected: fn() },
} satisfies Meta<typeof RadioScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Figma "Connected" (node 123:246). Click the switch, buttons and power key to see their states. */
export const Connected: Story = { args: { defaultOn: true } };

/** How the screen opens: radio off, Start story showing. */
export const RadioOff: Story = {};

/** Figma "Connecting" (node 154:1263): static on the LCD and in the speaker, LED blinking. Holds here. */
export const Connecting: Story = { args: { defaultState: "connecting", connectMs: 600_000 } };

/** Flip the switch on: Connecting..., then "Currently connected to @sunny_side", then the character. */
export const ConnectThenTalk: Story = { name: "Connect, then talk", args: { connectMs: 3000 } };

/** The connection drops: red LED, "Connection lost" on the LCD. */
export const ConnectionLost: Story = { args: { defaultState: "lost" } };

/** Flip the switch on and it fails after Connecting... */
export const ConnectThenFail: Story = { name: "Connect, then fail", args: { outcome: "lost" } };

export const Switch: Story = {
  name: "Rocker switch",
  render: function Render() {
    const [on, setOn] = useState(true);
    return (
      <div className="flex items-start gap-8 bg-[#262626] p-6">
        <RockerSwitch on={on} onChange={setOn} />
        <RockerSwitch on={!on} onChange={(v) => setOn(!v)} />
      </div>
    );
  },
};

export const ButtonStates: Story = {
  name: "Button states",
  render: () => (
    <div className="grid grid-cols-[195px_70px_44px] items-center gap-x-4 gap-y-3 bg-[#262626] p-6 text-[10px] text-label/80">
      <span>UP</span><span /><span />
      <HardwareButton tone="end">
        <PhoneDisconnect size={24} className="opacity-80" />
        <span className="text-base font-bold opacity-80">END CALL</span>
      </HardwareButton>
      <HardwareButton className="w-[70px]"><Microphone size={24} className="opacity-60" /></HardwareButton>
      <PowerButton />
      <span>DOWN (HELD OR LATCHED)</span><span /><span />
      <HardwareButton tone="end" pressed>
        <PhoneDisconnect size={24} className="opacity-80" />
        <span className="text-base font-bold opacity-80">END CALL</span>
      </HardwareButton>
      <HardwareButton className="w-[70px]" pressed><Microphone size={24} className="opacity-60" /></HardwareButton>
    </div>
  ),
};

/** The load-in after the splash: blueprint frames, then each part flashes into the real radio. Reload the story to replay. */
export const LoadIn: Story = {
  render: (args) => (
    <RadioIntro>
      <RadioScreen {...args} />
    </RadioIntro>
  ),
};
