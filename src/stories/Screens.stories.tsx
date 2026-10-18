import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactNode } from "react";
import { useState } from "react";
import { RadioScreen } from "@/components/radio";
import { CodeStep, PhoneStep, ProfileView } from "@/components/profile";
import { AddressList, Button, DotTrail, SegmentedTabs, StatusBar, TextInput } from "@/components/ui";
import { sampleProfile } from "@/lib/profile/sample";

/** Compositions of the Figma screens (iPhone 16, 393 × 852) built from the components. */
const meta: Meta = { title: "Screens", parameters: { layout: "centered" } };
export default meta;

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[852px] w-[393px] flex-col overflow-hidden border border-border bg-background uppercase">
      <StatusBar time="9:41" />
      <div className="flex flex-1 flex-col gap-4 px-8 pb-8 pt-4">{children}</div>
    </div>
  );
}

/** Getting set up (Figma nodes 123:691 and 123:701). */
export const SignIn: StoryObj = {
  render: () => <div className="flex w-[393px] [&>div]:min-h-[852px]"><PhoneStep digits="" onDigitsChange={() => {}} onNext={() => {}} /></div>,
};

export const VerificationCode: StoryObj = {
  render: () => <div className="flex w-[393px] [&>div]:min-h-[852px]"><CodeStep digits="1234567890" code="" onCodeChange={() => {}} onNext={() => {}} /></div>,
};

export const StartJourney: StoryObj = {
  render: function Render() {
    const [tab, setTab] = useState<"Destination" | "Duration">("Destination");
    return (
      <Phone>
        <SegmentedTabs label="Trip setup" options={["Destination", "Duration"] as const} value={tab} onChange={setTab} />
        <p className="font-display text-2xl">{tab === "Destination" ? "Enter your destination" : "How long's your trip"}</p>
        <TextInput aria-label={tab} placeholder={tab === "Destination" ? "Search address" : "2 hr 14 min"} />
        {tab === "Destination" && (
          <AddressList
            items={[
              { id: "1", name: "Golden Gate Park", detail: "San Francisco, CA" },
              { id: "2", name: "Golden Gate Bridge", detail: "US-101, San Francisco" },
            ]}
          />
        )}
        <div className="mt-auto flex flex-col gap-4">
          <DotTrail total={14} lit={0} />
          <Button fullWidth>Start journey</Button>
        </div>
      </Phone>
    );
  },
};

/** The finalized Figma screen (node 123:246). */
export const RadioConnected: StoryObj = {
  render: () => <RadioScreen defaultOn />,
};

/** Figma node 123:541. */
export const Profile: StoryObj = {
  render: () => {
    const now = new Date(2026, 9, 18, 9, 30);
    return <div className="flex w-[393px] [&>div]:min-h-[852px]"><ProfileView handle="@traveller7890" joinedAt={new Date(2026, 4, 2)} now={now} {...sampleProfile(now)} /></div>;
  },
};
