import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CalendarDots } from "./CalendarDots";
import { DotTrail } from "./DotTrail";
import { MapMarker } from "./MapMarker";
import { StatCard } from "./StatCard";

const meta: Meta = { title: "Components/Display" };
export default meta;

export const Stat: StoryObj = { render: () => <StatCard className="w-[305px]" value={602} label="total calls" /> };

export const RouteProgress: StoryObj = {
  name: "Dot trail",
  render: () => (
    <div className="flex flex-col gap-4">
      <DotTrail total={12} lit={0} />
      <DotTrail total={12} lit={5} />
      <DotTrail total={12} lit={12} />
    </div>
  ),
};

export const Calendar: StoryObj = {
  render: () => <div className="border border-border px-[33px] pb-7 pt-[39px]"><CalendarDots days={31} startOffset={4} label="October 2026" active={[1, 2, 5, 8, 9, 12, 15, 16, 20, 22, 23, 28]} /></div>,
};

export const Markers: StoryObj = {
  render: () => (
    <div className="flex gap-3">
      <MapMarker color="lime" label="You" />
      <MapMarker color="sky" label="Traveller" />
      <MapMarker color="magenta" label="Traveller" />
      <MapMarker color="orange" label="Traveller" />
    </div>
  ),
};
