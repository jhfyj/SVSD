import { Overview, type OverviewStep } from "@/components/onboarding/Overview";

export const metadata = { title: "Overview · SVSD" };

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams;
  const n = Number(step);
  const current: OverviewStep = n === 2 || n === 3 ? n : 1;
  return (
    <main className="flex min-h-full flex-1 justify-center bg-backdrop">
      <Overview step={current} />
    </main>
  );
}
