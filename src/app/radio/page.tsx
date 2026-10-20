import { Suspense } from "react";
import { Radio } from "./Radio";

export default function RadioPage() {
  return (
    // The radio is exactly the phone screen (393 x 852) and is built to sit under the status bar: its
    // casing fills the top and the map starts just below it. So it pulls up over the status bar's
    // space instead of being centred in it, which pushed it down, showed a strip of backdrop above
    // and clipped the keys below.
    <main className="-mt-[var(--status-bar-height,0px)] flex flex-1 justify-center">
      <Suspense>
        <Radio />
      </Suspense>
    </main>
  );
}
