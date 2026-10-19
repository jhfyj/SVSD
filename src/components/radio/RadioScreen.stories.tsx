import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { Microphone, PhoneDisconnect } from "@phosphor-icons/react";
import { HardwareButton } from "./HardwareButton";
import { PowerButton } from "./PowerButton";
import { RadioIntro } from "./RadioIntro";
import { RadioScreen } from "./RadioScreen";
import { RockerSwitch } from "./RockerSwitch";
import { SAMPLE_MESSAGES } from "@/lib/radio/messages";

const meta = {
  title: "Radio/RadioScreen",
  component: RadioScreen,
  // arrived: false keeps the call buttons on every story here; the destination screens live in
  // Radio/Finished journey, so a trip saved earlier can't flip these to End trip.
  args: { onEndCall: fn(), onConnected: fn(), arrived: false },
} satisfies Meta<typeof RadioScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Figma "Connected" (node 123:246). Click the switch, buttons and power key to see their states. */
export const Connected: Story = { args: { defaultOn: true } };

/** How the screen opens: radio off, Start story showing. Your character (Freddie by default) sits on the LCD. */
export const RadioOff: Story = {};

/**
 * Nothing on the radio: your own character keeps you company on the LCD, bobbing a pixel at a
 * resting pace. It's the one you picked in Customize profile (pick another with the control). It
 * steps aside for anything else (a message, a drop, the radio switching on) and flashes back after.
 */
export const IdleCompanion: Story = {
  name: "Idle: your character keeps you company",
  args: { meCharacter: "fox", messages: [] },
  argTypes: {
    meCharacter: { control: "select", options: ["raccoon", "deer", "squirrel", "fox", "rabbit", "turtle", "cat", "frog"] },
  },
};

/** Figma "Connecting" (node 154:1263): CONNECTING with dots stepping in, LED blinking. Holds here. */
export const Connecting: Story = { args: { defaultState: "connecting", connectMs: 600_000 } };

/** Flip the switch on: Connecting..., then "Currently connected to @sunny_side", then their character. */
export const ConnectThenTalk: Story = { name: "Connect, then talk", args: { connectMs: 3000 } };

/** On a call, they're quiet: their character idles with @username underneath. */
export const InCallIdle: Story = { name: "In call, idle", args: { defaultState: "connected", speaking: false } };

/** On a call, they're talking: their character hops and sound waves pulse beside it. */
export const InCallSpeaking: Story = { name: "In call, speaking", args: { defaultState: "connected", speaking: true } };

/** The connection drops: red LED, "Connection lost" on the LCD. */
export const ConnectionLost: Story = { args: { defaultState: "lost" } };

/** Flip the switch on and it fails after Connecting... */
export const ConnectThenFail: Story = { name: "Connect, then fail", args: { outcome: "lost" } };

/** Flip the radio on and it asks what you're up for: four keys. Your last pick is kept after 3 seconds. */
export const PickIntent: Story = { name: "Pick what you're up for", args: { defaultState: "pick" } };

/**
 * The demo video's call: pick Off my chest, then the radio introduces you both out loud,
 * "@NightOwl, meet @Mothlight. You've got 84 miles of road together", and asks where you're headed.
 */
export const IntroduceYouBoth: Story = {
  name: "Introduce you both",
  args: { defaultState: "pick", me: "@NightOwl", peer: "@Mothlight", sharedMiles: 84, connectMs: 2000 },
};

/**
 * Figma "Message" (node 116:91): you pass a magenta marker with the radio off. Static, then their
 * voice; the map glows with it. Press RESPOND within 5 seconds and you record a reply when they finish.
 * (Click the canvas once if the browser held the audio back.)
 */
export const MessageOnTheRoad: Story = {
  name: "Message on the road",
  args: { defaultMessage: SAMPLE_MESSAGES[0], messageEveryMs: 600_000 },
};

/** Figma "Question" (node 116:131): the same, in sky blue, asking you something. */
export const QuestionOnTheRoad: Story = {
  name: "Question on the road",
  args: { defaultMessage: SAMPLE_MESSAGES[1], messageEveryMs: 600_000 },
};

/** Leave the radio off and messages arrive on their own: the first after 6 seconds, then every 20. */
export const MessagesAlongTheDrive: Story = {
  name: "Messages along the drive",
  args: { messageEveryMs: 20_000 },
};

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
      <HardwareButton className="w-[70px]"><Microphone size={24} className="opacity-60" aria-hidden /></HardwareButton>
      <PowerButton />
      <span>DOWN (HELD OR LATCHED)</span><span /><span />
      <HardwareButton tone="end" pressed>
        <PhoneDisconnect size={24} className="opacity-80" />
        <span className="text-base font-bold opacity-80">END CALL</span>
      </HardwareButton>
      <HardwareButton className="w-[70px]" pressed><Microphone size={24} className="opacity-60" aria-hidden /></HardwareButton>
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

/** Night mode's sunset switches the page to the night theme, the way the app pins it. */
const nightfall = () => (document.documentElement.dataset.theme = "dark");

/**
 * Night mode (Flow 6), from the top. Starts by day: the sun sinks across the map, the light goes
 * amber, the radio flickers back on in amber with NIGHT MODE ON. Then it checks in, listens to a
 * slow answer and sends you to the rest area. Nothing to tap. Reload the story to replay.
 */
export const NightFalls: Story = {
  name: "Night mode · Night falls",
  globals: { theme: "light" },
  args: { night: "fall", onNightfall: nightfall, messages: [] },
};

/** "Still with me? Tell me one thing you can see." The radio asks out loud, then listens. */
export const NightCheckIn: Story = {
  name: "Night mode · Check-in",
  globals: { theme: "dark" },
  args: { night: "checkin", messages: [] },
};

/** Answers slowing down: REST AREA 9 MI takes over the map, stories pause, one key routes you there. */
export const NightRestArea: Story = {
  name: "Night mode · Rest area",
  globals: { theme: "dark" },
  args: { night: "rest", messages: [] },
};
