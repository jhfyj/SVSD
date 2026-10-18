"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import type { DropKind } from "@/lib/radio/drops";
import { DropPin } from "./DropPin";

const meta: Meta = { title: "Radio/Drop pins" };
export default meta;

const KINDS: { kind: DropKind; name: string }[] = [
  { kind: "question", name: "Question" },
  { kind: "story", name: "Story" },
  { kind: "tip", name: "Tip" },
];

/** The three pins a drop can become, on the dark map. */
export const Kinds: StoryObj = {
  render: () => (
    <div className="flex gap-8 bg-[#111] p-8">
      {KINDS.map(({ kind, name }) => (
        <div key={kind} className="flex flex-col items-center gap-2">
          <DropPin kind={kind} label={name} />
          <span className="font-mono text-[11px] uppercase text-white/70">{name}</span>
        </div>
      ))}
    </div>
  ),
};

/** The landing: it falls onto the road, squashes, settles, and a ring ripples out. Replay to watch again. */
export const Landing: StoryObj = {
  render: function Render() {
    const [round, setRound] = useState(0);
    return (
      <div className="flex flex-col items-start gap-4 bg-[#111] p-8">
        <div className="flex gap-24 px-12 py-16">
          {KINDS.map(({ kind, name }) => (
            <DropPin key={`${kind}-${round}`} kind={kind} label={name} land />
          ))}
        </div>
        <button type="button" onClick={() => setRound((r) => r + 1)} className="border border-white/40 px-3 py-1 font-mono text-[11px] uppercase text-white">
          Replay
        </button>
      </div>
    );
  },
};
