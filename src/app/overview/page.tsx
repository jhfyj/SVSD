import { Suspense } from "react";
import { Overview, type OverviewStep } from "@/components/onboarding/Overview";

export const metadata = { title: "Overview · SVSD" };

type Params = Promise<{ step?: string }>;

// The step comes from the address, so it's read inside Suspense (like /profile): the rest of the
// page can still be prerendered.
export default function OverviewPage({ searchParams }: { searchParams: Params }) {
  return (
    <main className="flex min-h-full flex-1 justify-center bg-backdrop">
      <Suspense fallback={<Overview step={1} />}>
        <Card searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Card({ searchParams }: { searchParams: Params }) {
  const { step } = await searchParams;
  const n = Number(step);
  const current: OverviewStep = n === 2 || n === 3 ? n : 1;
  return <Overview step={current} />;
}
