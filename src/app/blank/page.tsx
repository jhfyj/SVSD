import { Suspense } from "react";
import { BlankScreen } from "@/components/dialkit/BlankScreen";

export const metadata = { title: "Not built yet · SVSD" };

export default function BlankPage() {
  return (
    <main className="flex min-h-full flex-1 justify-center bg-backdrop">
      <Suspense>
        <BlankScreen />
      </Suspense>
    </main>
  );
}
