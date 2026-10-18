import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { SegmentedTabs } from "./SegmentedTabs";

const meta: Meta<typeof SegmentedTabs> = { title: "Components/SegmentedTabs", component: SegmentedTabs };
export default meta;

export const DestinationDuration: StoryObj = {
  render: function Render() {
    const [value, setValue] = useState<"Destination" | "Duration">("Destination");
    return (
      <div className="w-80">
        <SegmentedTabs label="Trip setup" options={["Destination", "Duration"] as const} value={value} onChange={setValue} />
      </div>
    );
  },
};
