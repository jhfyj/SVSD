"use client";

import { useRouter } from "next/navigation";
import { deleteAccount, signOut, useSession } from "@/lib/auth/session";
import { sampleProfile } from "@/lib/profile/sample";
import { TopBar } from "../journey/TopBar";
import { ProfileView } from "./Profile";
import { PhoneSignIn } from "./SignIn";

/** /profile: the phone sign-in until there's a session, then the profile. */
export function ProfileScreen() {
  const session = useSession();
  const router = useRouter();

  if (session === undefined) {
    return (
      <div className="flex min-h-dvh w-full max-w-[393px] flex-col bg-background">
        <TopBar />
      </div>
    );
  }
  if (!session) return <PhoneSignIn />;

  const { totalCalls, month, activeDays, history } = sampleProfile();
  return (
    <ProfileView
      handle={`@traveller${session.phone.slice(-4)}`}
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
        deleteAccount();
        router.push("/");
      }}
    />
  );
}
