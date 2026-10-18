"use client";

import Link from "next/link";
import { useState } from "react";
import { cue } from "@/lib/sound";
import { cn } from "../ui/cn";
import { ScrambleText } from "../ui/ScrambleText";
import { TabBar } from "../ui/TabBar";
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
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background uppercase text-foreground">
      <TopBar />
      <fieldset className="mx-11 mt-16 flex flex-col">
        <legend className="mb-9 text-sm"><ScrambleText>What brings you here today</ScrambleText></legend>
        <div className="flex flex-col gap-[18px]">
          {INTENTS.map((item) => {
            const on = item.id === intent;
            return (
              <label
                key={item.id}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-token border p-4 transition-colors duration-150 ease-out",
                  on ? "border-foreground text-foreground" : "border-border text-foreground/70 hover:text-foreground",
                )}
              >
                <input
                  type="radio"
                  name="intent"
                  value={item.id}
                  checked={on}
                  onChange={() => {
                    setIntent(item.id);
                    cue("select");
                  }}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={cn("size-2.5 shrink-0 rounded-full border", on ? "border-foreground bg-foreground" : "border-current")}
                />
                <span className="flex flex-col gap-0.5 peer-focus-visible:underline">
                  <span className="text-xs">{item.label}</span>
                  <span className={cn("text-xs normal-case", on && "text-foreground/70")}>
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
        data-cuelume-tap=""
        data-cuelume-theme="mech"
        className="mx-11 mb-14 mt-auto flex h-12 items-center justify-center rounded-token border border-foreground text-sm transition-colors duration-150 ease-out hover:bg-surface focus-visible:bg-surface"
      >
        Next
      </Link>
      <TabBar current="journey" />
    </div>
  );
}
