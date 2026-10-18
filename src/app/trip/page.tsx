import { TripSummary } from "@/components/trip";

export const metadata = { title: "Your trip · SVSD" };

export default function TripPage() {
  return (
    <main className="flex min-h-full flex-1 justify-center bg-backdrop">
      <TripSummary />
    </main>
  );
}
