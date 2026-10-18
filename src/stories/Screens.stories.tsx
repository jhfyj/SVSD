import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactNode } from "react";
import { useState } from "react";
import { RadioConsole } from "@/components/radio";
import { LcdScreen, PixelMascot } from "@/components/radio/LcdScreen";
import {
  AddressList,
  Button,
  CalendarDots,
  DotTrail,
  FlagIcon,
  MenuRow,
  SegmentedTabs,
  SettingsIcon,
  StatCard,
  StatusBar,
  TextInput,
} from "@/components/ui";

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

export const SignIn: StoryObj = {
  render: () => (
    <Phone>
      <div className="flex flex-1 flex-col justify-center gap-6">
        <LcdScreen className="mx-auto size-24"><PixelMascot size={6} /></LcdScreen>
        <TextInput label="Phone number" type="tel" placeholder="(555) 000-0000" />
        <Button fullWidth>Sign in</Button>
        <Button fullWidth variant="secondary" dot={false}>Sign up</Button>
      </div>
    </Phone>
  ),
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

export const RadioConnected: StoryObj = {
  render: () => (
    <Phone>
      <div className="flex flex-1 flex-col items-center justify-end">
        <RadioConsole state="connected" />
      </div>
    </Phone>
  ),
};

export const Profile: StoryObj = {
  render: () => (
    <Phone>
      <div className="flex items-center gap-4">
        <LcdScreen className="size-16 rounded-full"><PixelMascot size={4} /></LcdScreen>
        <div className="flex flex-col gap-1">
          <span className="text-lg">Traveller 0412</span>
          <span className="text-[11px] text-foreground/60">Joined Oct 2026</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard value={602} label="Total calls" />
        <StatCard value="41 hr" label="On the road" />
      </div>
      <CalendarDots days={31} startOffset={2} active={[1, 2, 5, 8, 9, 12, 15, 16]} />
      <div className="mt-auto flex flex-col divide-y divide-border">
        <MenuRow icon={<SettingsIcon />} label="Settings" />
        <MenuRow icon={<FlagIcon />} label="Report" />
        <MenuRow label="Delete account" tone="danger" />
      </div>
    </Phone>
  ),
};
