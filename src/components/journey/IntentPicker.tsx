"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "../ui/cn";
import { ScrambleText } from "../ui/ScrambleText";
import { TopBar } from "./TopBar";

/** Copy from the SVSD product doc: one row per way to spend the drive. */
export const INTENTS = [
  { id: "listen", label: "Just drive", line: "Stories will find you along the way" },
  { id: "calls", label: "Radio on", line: "Want company on this stretch?", verified: true },
  { id: "story", label: "Leave a story", line: "Tell the next driver something", verified: true },
  { id: "answer", label: "Answer", line: "Someone on this road asked you something" },
] as const;

export type IntentId = (typeof INTENTS)[number]["id"];

/** After Start your journey (Figma iPhone 16 - 69): pick what brings you here, then set up the trip. */
export function IntentPicker({ href = "/journey", initial = "listen" }: { href?: string; initial?: IntentId }) {
  const [intent, setIntent] = useState<IntentId>(initial);
  return (
    <div className="rain flex min-h-dvh w-full max-w-[393px] flex-col bg-background uppercase text-foreground">
      <TopBar />
      <fieldset className="mx-12 mt-[218px] flex flex-col">
        <legend className="mb-9 text-sm tracking-wide"><ScrambleText>What brings you here today</ScrambleText></legend>
        <div className="flex flex-col gap-[18px]">
          {INTENTS.map((item) => {
            const on = item.id === intent;
            return (
              <label
                key={item.id}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-token border px-[23px] py-2.5 transition-colors",
                  on ? "border-foreground text-foreground" : "border-border text-muted hover:text-label",
                )}
              >
                <input
                  type="radio"
                  name="intent"
                  value={item.id}
                  checked={on}
                  onChange={() => setIntent(item.id)}
                  data-cuelume-select=""
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={cn("size-2.5 shrink-0 rounded-full border", on ? "border-foreground bg-foreground" : "border-current")}
                />
                <span className="flex flex-col gap-0.5 peer-focus-visible:underline">
                  <span className="text-xs tracking-wide">{item.label}</span>
                  <span className="text-[10px] normal-case tracking-normal opacity-70">
                    {item.line}
                    {"verified" in item && " · needs a verified phone, 18+"}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <Link
        href={`${href}?intent=${intent}`}
        data-cuelume-navigate=""
        className="mx-11 mb-[61px] mt-auto flex h-[47px] items-center justify-center rounded-token border border-foreground text-sm tracking-wide transition-colors hover:bg-surface focus-visible:bg-surface"
      >
        Next
      </Link>
    </div>
  );
}
