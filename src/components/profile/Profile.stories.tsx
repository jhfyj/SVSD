import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { CHARACTERS, type CharacterId } from "@/lib/profile/characters";
import { sampleProfile } from "@/lib/profile/sample";
import { CharacterSprite } from "./CharacterSprite";
import { CustomizeProfile } from "./CustomizeProfile";
import { CodeStep, PhoneSignIn, PhoneStep } from "./SignIn";
import { ProfileView } from "./Profile";

/** Phone sign in, Customize profile and the profile (Figma "Getting set up" and "Profile"). */
const meta: Meta = {
  title: "Profile",
  parameters: { layout: "centered" },
  decorators: [(Story) => <div className="flex w-[393px] [&>div]:min-h-[852px]"><Story /></div>],
};
export default meta;

const NOW = new Date(2026, 9, 18, 9, 30);
const sample = sampleProfile(NOW);

/** The whole flow with the mocked SMS: any 6 digits sign you in, 000000 shows the error. */
/** Signing up picks a character (Customize profile) before the profile; tap the avatar to change it. */
export const SignInFlow: StoryObj = {
  render: function Render() {
    const [signedIn, setSignedIn] = useState(false);
    const [character, setCharacter] = useState<CharacterId | null>(null);
    const [editing, setEditing] = useState(false);
    if (signedIn && (!character || editing)) {
      return (
        <CustomizeProfile
          initial={character ?? undefined}
          onSave={(id) => {
            setCharacter(id);
            setEditing(false);
          }}
          onBack={() => (character ? setEditing(false) : setSignedIn(false))}
        />
      );
    }
    return signedIn && character ? (
      <ProfileView
        handle="@traveller7890"
        character={character}
        onEditCharacter={() => setEditing(true)}
        joinedAt={NOW}
        now={NOW}
        {...sample}
        onSignOut={() => {
          setSignedIn(false);
          setCharacter(null);
        }}
      />
    ) : (
      <PhoneSignIn onSignedIn={() => setSignedIn(true)} verify={async (phone, code) => {
        await new Promise((r) => setTimeout(r, 400));
        if (code === "000000") throw new Error("That code didn't match. Try again.");
        return { phone, joinedAt: NOW.toISOString() };
      }} send={() => new Promise((r) => setTimeout(r, 400))} />
    );
  },
};

export const Customize: StoryObj = {
  name: "Customize profile",
  render: () => <CustomizeProfile onSave={() => {}} onBack={() => {}} />,
};

export const CustomizePicked: StoryObj = {
  name: "Customize profile, Tako picked",
  render: () => <CustomizeProfile initial="tako" onSave={() => {}} onBack={() => {}} />,
};

/** All eight characters with both animation frames side by side. */
export const Characters: StoryObj = {
  decorators: [(Story) => <div className="bg-background p-6 text-foreground"><Story /></div>],
  render: () => (
    <div className="grid grid-cols-4 gap-6">
      {CHARACTERS.map((c) => (
        <figure key={c.id} className="flex flex-col items-center gap-2">
          <div className="flex gap-1 text-tile-active-ink">
            {c.frames.map((_, f) => (
              <span key={f} className="bg-tile-active p-1">
                <CharacterSprite character={c.id} pixel={3} playing={false} className={f ? "[&>.sprite-a]:invisible [&>.sprite-b]:visible" : undefined} />
              </span>
            ))}
            <span className="bg-lcd p-1 text-lcd-ink">
              <CharacterSprite character={c.id} pixel={3} />
            </span>
          </div>
          <figcaption className="text-sm text-label">{c.name}</figcaption>
        </figure>
      ))}
    </div>
  ),
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
  render: () => <ProfileView handle="@traveller7890" character="bun" onEditCharacter={() => {}} joinedAt={new Date(2026, 4, 2)} now={NOW} {...sample} />,
};

export const ProfileNew: StoryObj = {
  name: "Profile, new account",
  render: () => (
    <ProfileView handle="@traveller7890" joinedAt={NOW} now={NOW} totalCalls={0} month={NOW} activeDays={[]} history={[]} />
  ),
};
