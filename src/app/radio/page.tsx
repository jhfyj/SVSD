import { Suspense } from "react";
import { FitScreen } from "./FitScreen";
import { Radio } from "./Radio";

export const metadata = { title: "Radio · SVSD" };

export default function RadioPage() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-backdrop">
      <Suspense>
        {/* On a phone the radio shrinks to fit the screen; on a desktop it stays 1:1. */}
        <FitScreen>
          <Radio />
        </FitScreen>
      </Suspense>
    </main>
  );
}
