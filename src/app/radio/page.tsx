import { Suspense } from "react";
import { Radio } from "./Radio";

export const metadata = { title: "Radio · SVSD" };

export default function RadioPage() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-backdrop">
      <Suspense>
        <Radio />
      </Suspense>
    </main>
  );
}
