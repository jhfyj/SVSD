import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { ScrambleText } from "./ScrambleText";

const meta: Meta<typeof ScrambleText> = {
  title: "Components/ScrambleText",
  component: ScrambleText,
  args: { children: "Start your journey", duration: 650, delay: 150 },
  argTypes: { duration: { control: { type: "range", min: 100, max: 2000, step: 50 } }, delay: { control: { type: "range", min: 0, max: 1000, step: 50 } } },
};
export default meta;

/** Larger text letters scramble through random letters and symbols before settling. Click Replay to run it again. */
export const Heading: StoryObj<typeof ScrambleText> = {
  render: function Render(args) {
    const [run, setRun] = useState(0);
    return (
      <div className="flex w-[329px] flex-col items-center gap-6 uppercase">
        <h1 className="text-center text-xl">
          <ScrambleText key={run} {...args} />
        </h1>
        <button type="button" onClick={() => setRun((r) => r + 1)} className="border border-border px-3 py-1 text-xs uppercase">
          Replay
        </button>
      </div>
    );
  },
};

export const LongHeading: StoryObj<typeof ScrambleText> = {
  ...Heading,
  args: { children: "Sign in or sign up with your phone number." },
};
