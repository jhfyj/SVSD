import { History } from "@/components/journey";

export const metadata = { title: "History · SVSD" };

export default function HistoryPage() {
  return (
    <main className="flex min-h-full flex-1 justify-center bg-backdrop">
      <History />
    </main>
  );
}
