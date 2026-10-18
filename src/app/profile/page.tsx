import { Suspense } from "react";
import { ProfileScreen } from "@/components/profile";

export const metadata = { title: "Profile · SVSD" };

type Params = Promise<{ settings?: string }>;

export default function ProfilePage({ searchParams }: { searchParams: Params }) {
  return (
    <main className="flex min-h-full flex-1 justify-center bg-backdrop">
      <Suspense fallback={<ProfileScreen />}>
        <Profile searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** `?settings=1` opens straight into Settings (the radio's settings button links here). */
async function Profile({ searchParams }: { searchParams: Params }) {
  const { settings } = await searchParams;
  return <ProfileScreen openSettings={settings === "1"} />;
}
