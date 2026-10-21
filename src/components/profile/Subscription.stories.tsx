import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import type { PlanId } from "@/lib/profile/plan";
import { Subscription } from "./Subscription";

const meta: Meta<typeof Subscription> = { title: "Profile/Subscription", component: Subscription };
export default meta;

function Live({ initial }: { initial: PlanId }) {
  const [plan, setPlan] = useState<PlanId>(initial);
  return (
    <div className="w-[305px]">
      <Subscription plan={plan} onChange={setPlan} />
    </div>
  );
}

export const Free: StoryObj = { render: () => <Live initial="free" /> };
export const Plus: StoryObj = { name: "Caravan+", render: () => <Live initial="plus" /> };
export const Enterprise: StoryObj = { render: () => <Live initial="enterprise" /> };
