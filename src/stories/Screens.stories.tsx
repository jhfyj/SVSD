import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactNode } from "react";
import { RadioScreen } from "@/components/radio";
import { CodeStep, CustomizeProfile, PhoneStep, ProfileView } from "@/components/profile";
import { AddressList, Button, DotTrail, StatusBar, TextInput } from "@/components/ui";
import { sampleProfile } from "@/lib/profile/sample";

/** Compositions of the Figma screens (iPhone 16, 393 × 852) built from the components. */
const meta: Meta = { title: "Screens", parameters: { layout: "centered" } };
export default meta;

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="grain flex h-[852px] w-[393px] flex-col overflow-hidden border border-border bg-background uppercase">
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
  render: () => (
    <Phone>
      <p className="font-display text-2xl">Enter your destination</p>
      <TextInput aria-label="Destination" placeholder="Search address" />
      <AddressList
        items={[
          { id: "1", name: "Golden Gate Park", detail: "San Francisco, CA" },
          { id: "2", name: "Golden Gate Bridge", detail: "US-101, San Francisco" },
        ]}
      />
      <div className="mt-auto flex flex-col gap-4">
        <DotTrail total={14} lit={0} />
        <Button fullWidth>Start journey</Button>
      </div>
    </Phone>
  ),
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

/** Figma node 154:1304: a new account picks its character after signing up. */
export const CustomizeProfileScreen: StoryObj = {
  name: "Customize profile",
  render: () => <div className="flex w-[393px] [&>div]:min-h-[852px]"><CustomizeProfile onSave={() => {}} onBack={() => {}} /></div>,
};
