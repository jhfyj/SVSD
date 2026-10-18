import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { sampleProfile } from "@/lib/profile/sample";
import { CodeStep, PhoneSignIn, PhoneStep } from "./SignIn";
import { ProfileView } from "./Profile";

/** Phone sign in and the profile (Figma "Getting set up" and "Profile"). */
const meta: Meta = {
  title: "Profile",
  parameters: { layout: "centered" },
  decorators: [(Story) => <div className="flex w-[393px] [&>div]:min-h-[852px]"><Story /></div>],
};
export default meta;

const NOW = new Date(2026, 9, 18, 9, 30);
const sample = sampleProfile(NOW);

/** The whole flow with the mocked SMS: any 6 digits sign you in, 000000 shows the error. */
export const SignInFlow: StoryObj = {
  render: function Render() {
    const [signedIn, setSignedIn] = useState(false);
    return signedIn ? (
      <ProfileView handle="@traveller7890" joinedAt={NOW} now={NOW} {...sample} onSignOut={() => setSignedIn(false)} />
    ) : (
      <PhoneSignIn onSignedIn={() => setSignedIn(true)} verify={async (phone, code) => {
        await new Promise((r) => setTimeout(r, 400));
        if (code === "000000") throw new Error("That code didn't match. Try again.");
        return { phone, joinedAt: NOW.toISOString() };
      }} send={() => new Promise((r) => setTimeout(r, 400))} />
    );
  },
};

export const PhoneEmpty: StoryObj = {
  name: "Phone number",
  render: () => <PhoneStep digits="" onDigitsChange={() => {}} onNext={() => {}} />,
};

export const PhoneFilled: StoryObj = {
  name: "Phone number, filled",
  render: () => <PhoneStep digits="4155550123" onDigitsChange={() => {}} onNext={() => {}} />,
};

export const PhoneSending: StoryObj = {
  name: "Phone number, sending",
  render: () => <PhoneStep digits="4155550123" onDigitsChange={() => {}} onNext={() => {}} sending />,
};

export const CodeEmpty: StoryObj = {
  name: "Verification code",
  render: () => <CodeStep digits="1234567890" code="" onCodeChange={() => {}} onNext={() => {}} />,
};

export const CodePartial: StoryObj = {
  name: "Verification code, typing",
  render: () => <CodeStep digits="1234567890" code="482" onCodeChange={() => {}} onNext={() => {}} />,
};

export const CodeWrong: StoryObj = {
  name: "Verification code, wrong",
  render: () => (
    <CodeStep digits="1234567890" code="" error="That code didn't match. Try again." onCodeChange={() => {}} onNext={() => {}} />
  ),
};

export const Profile: StoryObj = {
  render: () => <ProfileView handle="@traveller7890" joinedAt={new Date(2026, 4, 2)} now={NOW} {...sample} />,
};

export const ProfileNew: StoryObj = {
  name: "Profile, new account",
  render: () => (
    <ProfileView handle="@traveller7890" joinedAt={NOW} now={NOW} totalCalls={0} month={NOW} activeDays={[]} history={[]} />
  ),
};
