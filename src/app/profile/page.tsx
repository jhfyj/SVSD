import { ProfileScreen } from "@/components/profile";

export const metadata = { title: "Profile · SVSD" };

export default function ProfilePage() {
  return (
    <main className="flex min-h-full flex-1 justify-center bg-black">
      <ProfileScreen />
    </main>
  );
}
