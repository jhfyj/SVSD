import { JourneySetup } from "@/components/journey";

export const metadata = { title: "Set up your journey · SVSD" };

export default function JourneyPage() {
  return (
    <main className="flex min-h-full flex-1 justify-center bg-black">
      <JourneySetup />
    </main>
  );
}
