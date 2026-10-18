"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAccount, signOut, useSession } from "@/lib/auth/session";
import { forgetCharacter, saveCharacter, useCharacter } from "@/lib/profile/avatar";
import { sampleProfile } from "@/lib/profile/sample";
import { TopBar } from "../journey/TopBar";
import { CustomizeProfile } from "./CustomizeProfile";
import { ProfileView } from "./Profile";
import { PhoneSignIn } from "./SignIn";

/**
 * /profile: the phone sign-in until there's a session, then the profile. A new account (no
 * character yet) picks its character on Customize profile first.
 */
export function ProfileScreen() {
  const session = useSession();
  const router = useRouter();
  const character = useCharacter(session?.phone);
  const [editing, setEditing] = useState(false);

  if (session === undefined || (session && character === undefined)) {
    return (
      <div className="flex min-h-dvh w-full max-w-[393px] flex-col bg-background">
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

  const { totalCalls, month, activeDays, history } = sampleProfile();
  return (
    <ProfileView
      handle={`@traveller${session.phone.slice(-4)}`}
      character={character}
      onEditCharacter={() => setEditing(true)}
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
        deleteAccount();
        router.push("/");
      }}
    />
  );
}
