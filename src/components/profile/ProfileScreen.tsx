"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAccount, signOut, useSession } from "@/lib/auth/session";
import { forgetCharacter, saveCharacter, useCharacter } from "@/lib/profile/avatar";
import { forgetOnboarded, markOnboarded, useOnboarded } from "@/lib/profile/onboarding";
import { sampleProfile } from "@/lib/profile/sample";
import { TopBar } from "../journey/TopBar";
import { AllowAccess } from "./AllowAccess";
import { CustomizeProfile } from "./CustomizeProfile";
import { ProfileView } from "./Profile";
import { PhoneSignIn } from "./SignIn";

/**
 * /profile: the phone sign-in until there's a session, then the profile. A new account (no
 * character yet) picks its character on Customize profile, then sees Allow access (mic,
 * notifications, location) once. Settings on the profile opens Allow access again.
 */
export function ProfileScreen() {
  const session = useSession();
  const router = useRouter();
  const character = useCharacter(session?.phone);
  const onboarded = useOnboarded(session?.phone);
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState(false);
  // Right after sign-up the account has no journeys yet; later visits show the placeholder history.
  const [justJoined, setJustJoined] = useState(false);

  if (session === undefined || (session && (character === undefined || onboarded === undefined))) {
    return (
      <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background">
        <TopBar />
      </div>
    );
  }
  if (!session) return <PhoneSignIn />;

  if (!character || editing) {
    return (
      <CustomizeProfile
        initial={character ?? undefined}
        onSave={(id) => {
          saveCharacter(session.phone, id);
          setEditing(false);
        }}
        // Backing out of sign-up returns to the phone screen; editing just closes.
        onBack={character ? () => setEditing(false) : signOut}
      />
    );
  }

  if (!onboarded) {
    return (
      <AllowAccess
        onDone={() => {
          setJustJoined(true);
          markOnboarded(session.phone);
        }}
      />
    );
  }
  if (settings) return <AllowAccess firstTime={false} onDone={() => setSettings(false)} onBack={() => setSettings(false)} />;

  const sample = sampleProfile();
  const { totalCalls, month, activeDays, history } = justJoined
    ? { ...sample, totalCalls: 0, activeDays: [], history: [] }
    : sample;
  return (
    <ProfileView
      handle={`@traveller${session.phone.slice(-4)}`}
      character={character}
      onEditCharacter={() => setEditing(true)}
      onSettings={() => setSettings(true)}
      joinedAt={new Date(session.joinedAt)}
      totalCalls={totalCalls}
      month={month}
      activeDays={activeDays}
      history={history}
      onSignOut={() => {
        signOut();
        router.push("/");
      }}
      onDeleteAccount={() => {
        forgetCharacter(session.phone);
        forgetOnboarded(session.phone);
        deleteAccount();
        router.push("/");
      }}
    />
  );
}
