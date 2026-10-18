import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Image from "next/image";
import { SAMPLE_MESSAGES } from "@/lib/radio/messages";
import type { Level } from "@/lib/radio/voice";
import { LcdScreen } from "./LcdScreen";
import { MessageGlow, MessageLcd } from "./RouteMessage";
import type { RouteMessageControls } from "./useRouteMessage";

/** Speech-like loudness without any audio: syllables of different weights, with pauses between phrases. */
const fakeVoice: Level = () => {
  const t = performance.now() / 1000;
  const phrase = t % 3.2 < 2.4 ? 1 : 0; // 2.4s talking, 0.8s breath
  const syllable = Math.max(0, Math.sin(t * Math.PI * 4.6)) ** 2;
  const stress = 0.55 + 0.45 * Math.sin(t * 1.7) ** 2;
  return phrase * syllable * stress;
};

const meta = {
  title: "Radio/Message on the road",
  component: MessageGlow,
  args: { mode: "voice", color: "magenta", level: { current: fakeVoice } },
  argTypes: {
    mode: { control: "inline-radio", options: ["off", "voice", "reply"] },
    color: { control: "inline-radio", options: ["magenta", "sky", "lime", "orange"] },
    level: { control: false },
  },
} satisfies Meta<typeof MessageGlow>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The glow alone over the placeholder map, driven by a fake voice. Voice: a wave comes down from
 * the top on each syllable and the glow reaches further when it's louder. Reply: it rises from the
 * bottom instead. Switch to Off to see it leave.
 */
export const Glow: Story = {
  render: (args) => (
    <div className="relative h-[509px] w-[365px] overflow-hidden bg-[#111]">
      <div className="absolute inset-0 [filter:var(--map-lcd-tint)]">
        <Image
          src="/radio/map-dithered.png"
          alt=""
          width={393}
          height={852}
          unoptimized
          className="absolute left-[-14px] top-[-64px] max-w-none [image-rendering:pixelated]"
        />
      </div>
      <MessageGlow {...args} />
    </div>
  ),
};

const controls = (over: Partial<RouteMessageControls>): RouteMessageControls => ({
  message: SAMPLE_MESSAGES[0],
  phase: "playing",
  respond: false,
  respondWindow: "open",
  asking: null,
  replyLeft: 42_000,
  level: { current: null },
  play: () => {},
  toggleRespond: () => {},
  answer: () => {},
  send: () => {},
  skip: () => {},
  ...over,
});

/** Every LCD a message can show: who it's from (Figma), with a reply chosen, the radio asking, recording, sent, and no mic. */
export const Lcd: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 bg-[#262626] p-6">
      {[
        controls({}),
        controls({ message: SAMPLE_MESSAGES[1] }),
        controls({ respond: true }),
        controls({ phase: "asking", asking: "listening" }),
        controls({ phase: "recording" }),
        controls({ phase: "sent" }),
        controls({ phase: "noMic" }),
      ].map((c, i) => (
        <LcdScreen key={i} className="h-[130px] w-[221px]">
          <MessageLcd controls={c} />
        </LcdScreen>
      ))}
    </div>
  ),
};
