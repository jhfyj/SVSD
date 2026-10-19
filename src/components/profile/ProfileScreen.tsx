"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAccount, signOut, useSession } from "@/lib/auth/session";
import { forgetCharacter, saveCharacter, useCharacter } from "@/lib/profile/avatar";
import { fallbackHandle, forgetHandle, saveHandle, useHandle } from "@/lib/profile/handle";
import { forgetOnboarded, markOnboarded, useOnboarded } from "@/lib/profile/onboarding";
import { TopBar } from "../journey/TopBar";
import { AllowAccess } from "./AllowAccess";
import { CustomizeProfile } from "./CustomizeProfile";
import { ProfileView } from "./Profile";
import { PhoneSignIn } from "./SignIn";

/**
 * /profile: the phone sign-in until there's a session, then the profile. A new account (no
 * character yet) picks its character and @handle on Customize profile, then straight to Start your
 * journey (flow 1: Overview 1-3, sign in, avatar, home). `welcome` (from the overview cards)
 * always shows the avatar step after sign-in, even for a number that already has one.
 * Allow access shows once, the first time the profile opens; Settings opens it again.
 */
export function ProfileScreen({ openSettings = false, welcome = false }: { openSettings?: boolean; welcome?: boolean }) {
  const session = useSession();
  const router = useRouter();
  const character = useCharacter(session?.phone);
  const onboarded = useOnboarded(session?.phone);
  const handle = useHandle(session?.phone);
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState(openSettings);

  if (session === undefined || (session && (character === undefined || onboarded === undefined || handle === undefined))) {
    return (
      <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background">
        <TopBar />
      </div>
    );
  }
  if (!session) return <PhoneSignIn />;

  if (!character || editing || welcome) {
    // Signing up: once the avatar is picked, on to Start your journey (not the profile).
    const signingUp = !character || welcome;
    return (
      <CustomizeProfile
        initial={character ?? undefined}
        // A new account (no handle yet) gets a random one; an older one starts from what it shows now.
        initialHandle={handle ?? (character ? fallbackHandle(session.phone) : undefined)}
        onSave={(id, name) => {
          saveCharacter(session.phone, id);
          saveHandle(session.phone, name);
          if (signingUp && !editing) return router.push("/");
          setEditing(false);
        }}
        // Backing out of sign-up returns to the phone screen; editing just closes.
        onBack={character && !welcome ? () => setEditing(false) : signOut}
      />
    );
  }

  if (!onboarded) {
    return (
      <AllowAccess
        onDone={() => markOnboarded(session.phone)}
      />
    );
  }
  if (settings) return <AllowAccess firstTime={false} onDone={() => setSettings(false)} onBack={() => setSettings(false)} />;

  return (
    <ProfileView
      handle={`@${handle ?? fallbackHandle(session.phone)}`}
      character={character}
      onEditCharacter={() => setEditing(true)}
      onSettings={() => setSettings(true)}
      joinedAt={new Date(session.joinedAt)}
      onSignOut={() => {
        signOut();
        router.push("/");
      }}
      onDeleteAccount={() => {
        forgetCharacter(session.phone);
        forgetHandle(session.phone);
        forgetOnboarded(session.phone);
        deleteAccount();
        router.push("/");
      }}
    />
  );
}
