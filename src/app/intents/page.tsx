import { IntentPicker } from "@/components/journey";

export const metadata = { title: "What brings you here · SVSD" };

export default function IntentsPage() {
  return (
    <main className="flex min-h-full flex-1 justify-center bg-backdrop">
      <IntentPicker />
    </main>
  );
}
