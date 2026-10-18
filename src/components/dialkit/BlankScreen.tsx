"use client";

import { useSearchParams } from "next/navigation";

/**
 * Stand-in for a screen the demo needs but that isn't built yet, so every step in the Dial Kit
 * opens something. Just the empty phone column, named faintly so you know where you are.
 */
export function BlankScreen() {
  const screen = useSearchParams().get("screen");
  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col items-center justify-center bg-background px-11 text-center uppercase text-foreground">
      {screen && <p className="text-xs text-foreground/40">{screen}</p>}
      <p className="mt-1 text-xs text-foreground/40">Not built yet</p>
    </div>
  );
}
