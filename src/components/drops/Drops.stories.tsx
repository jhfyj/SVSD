import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { CollectedTally, CollectFlight } from "./CollectFlight";
import { DropMarker } from "./DropMarker";
import type { DropKind } from "./glyphs";
import { PixelGlyph, VoxelIcon } from "./VoxelIcon";

const KINDS: DropKind[] = ["story", "tip", "question"];

const meta = {
  title: "Drops/Drops on the road",
  component: VoxelIcon,
  args: { kind: "story", px: 6, depth: 3, spin: true },
  argTypes: { kind: { control: "inline-radio", options: KINDS } },
  parameters: { backgrounds: { default: "dark" } },
} satisfies Meta<typeof VoxelIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

/** One block, big, spinning: play with the cell size and depth. */
export const Block: Story = {};

/** The three kinds side by side: stories purple, tips yellow, questions blue. */
export const AllKinds: Story = {
  render: () => (
    <div className="flex items-end gap-12 bg-[#111] p-10">
      {KINDS.map((kind) => (
        <figure key={kind} className="flex flex-col items-center gap-4 text-xs uppercase text-foreground/70">
          <VoxelIcon kind={kind} px={6} spin />
          <PixelGlyph kind={kind} px={3} />
          <figcaption>{kind}</figcaption>
        </figure>
      ))}
    </div>
  ),
};

/** As they wait on the map: floating, with the square ring pulsing across the road. */
export const OnTheMap: Story = {
  render: () => (
    <div className="flex items-end gap-16 bg-[#2a2a2a] p-12">
      {KINDS.map((kind) => (
        <DropMarker key={kind} kind={kind} />
      ))}
    </div>
  ),
};

/** The pickup: the pop, the chime and the flight into the LCD. Click to play it again. */
export const Collect: Story = {
  render: function Render() {
    const [run, setRun] = useState(0);
    const [count, setCount] = useState(0);
    return (
      <div className="relative h-[420px] w-[393px] cursor-pointer bg-[#2a2a2a]" onClick={() => setRun((r) => r + 1)}>
        <div className="absolute left-[156px] top-[270px] h-[130px] w-[221px] bg-lcd shadow-[var(--lcd-inset)]">
          <CollectedTally counts={{ story: count }} flash={count} />
        </div>
        <CollectFlight key={run} kind="story" from={{ x: 150, y: 120 }} to={{ x: 266, y: 386 }} onLanded={() => setCount((c) => c + 1)} />
        <p className="absolute left-3 top-3 text-xs uppercase text-foreground/70">Click to collect again</p>
      </div>
    );
  },
};
