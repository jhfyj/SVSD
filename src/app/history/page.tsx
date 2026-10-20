import { connection } from "next/server";
import { Suspense } from "react";
import { History } from "@/components/journey";

export default function HistoryPage() {
  return (
    <main className="flex min-h-full flex-1 justify-center bg-backdrop">
      <Suspense>
        <Stats />
      </Suspense>
    </main>
  );
}

/** Built when opened, not ahead of time: the placeholder stats and calendar are counted from today. */
async function Stats() {
  await connection();
  return <History />;
}
