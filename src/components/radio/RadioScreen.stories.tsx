import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { Microphone } from "@carbon/icons-react";
import { PhoneDisconnect } from "@phosphor-icons/react";
import { HardwareButton } from "./HardwareButton";
import { PowerButton } from "./PowerButton";
import { RadioScreen } from "./RadioScreen";
import { RockerSwitch } from "./RockerSwitch";

const meta = {
  title: "Radio/RadioScreen",
  component: RadioScreen,
  args: { onEndCall: fn(), onPower: fn() },
} satisfies Meta<typeof RadioScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Figma "Connected" (node 123:246). Click the switch, buttons and power key to see their states. */
export const Connected: Story = {};

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
    <div className="grid grid-cols-[195px_70px_44px] items-center gap-x-4 gap-y-3 bg-[#262626] p-6 text-[11px] text-label/80">
      <span>UP</span><span /><span />
      <HardwareButton tone="end">
        <PhoneDisconnect size={24} className="opacity-80" />
        <span className="text-[20px] font-bold opacity-80">END CALL</span>
      </HardwareButton>
      <HardwareButton className="w-[70px]"><Microphone size={24} className="opacity-60" /></HardwareButton>
      <PowerButton />
      <span>DOWN (HELD OR LATCHED)</span><span /><span />
      <HardwareButton tone="end" pressed>
        <PhoneDisconnect size={24} className="opacity-80" />
        <span className="text-[20px] font-bold opacity-80">END CALL</span>
      </HardwareButton>
      <HardwareButton className="w-[70px]" pressed><Microphone size={24} className="opacity-60" /></HardwareButton>
    </div>
  ),
};
