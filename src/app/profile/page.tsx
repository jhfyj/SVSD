import { Suspense } from "react";
import { ProfileScreen } from "@/components/profile";

type Params = Promise<{ settings?: string; welcome?: string }>;

export default function ProfilePage({ searchParams }: { searchParams: Params }) {
  return (
    <main className="flex min-h-full flex-1 justify-center bg-backdrop">
      <Suspense fallback={<ProfileScreen />}>
        <Profile searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/**
 * `?settings=1` opens straight into Settings (the radio's settings button links here).
 * `?welcome=1` is sign-up from the overview cards: sign in, pick your avatar and language, then the profile.
 */
async function Profile({ searchParams }: { searchParams: Params }) {
  const { settings, welcome } = await searchParams;
  return <ProfileScreen openSettings={settings === "1"} welcome={welcome === "1"} />;
}
