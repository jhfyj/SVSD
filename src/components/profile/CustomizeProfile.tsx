"use client";

import { ArrowLeft } from "@carbon/icons-react";
import { useState } from "react";
import { CHARACTERS, DEFAULT_CHARACTER, getCharacter, type CharacterId } from "@/lib/profile/characters";
import { cue } from "@/lib/sound";
import { cn } from "../ui/cn";
import { CharacterSprite } from "./CharacterSprite";

export type CustomizeProfileProps = {
  /** The character picked so far; Freddie for a new account. */
  initial?: CharacterId;
  onSave: (character: CharacterId) => void;
  onBack?: () => void;
  saving?: boolean;
};

/**
 * Customize profile (Figma node 154:1304): pick one of eight LCD pets. The picked one lights up
 * green and plays its two-frame loop, in the tile and in the avatar up top.
 */
export function CustomizeProfile({ initial = DEFAULT_CHARACTER, onSave, onBack, saving }: CustomizeProfileProps) {
  const [picked, setPicked] = useState<CharacterId>(initial);

  const move = (by: number) => {
    const i = CHARACTERS.findIndex((c) => c.id === picked);
    const next = CHARACTERS[(i + by + CHARACTERS.length) % CHARACTERS.length];
    setPicked(next.id);
    document.getElementById(`character-${next.id}`)?.focus();
  };

  return (
    <div className="rain flex min-h-dvh w-full max-w-[393px] flex-col bg-background text-foreground">
      <header className="relative flex h-[26px] items-center justify-center mt-[59px]">
        {onBack && (
          <button
            type="button"
            onClick={() => {
              cue("navigate", { direction: "back" });
              onBack();
            }}
            aria-label="Back"
            className="absolute left-[13px] flex size-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-foreground"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <h1 className="text-xl">CUSTOMIZE PROFILE</h1>
      </header>

      <div className="mt-[29px] flex justify-center">
        <div className="flex size-[106px] items-center justify-center overflow-hidden rounded-full bg-lcd text-lcd-ink shadow-[var(--lcd-inset)]">
          <CharacterSprite key={picked} character={picked} pixel={4.4} className="opacity-80" />
        </div>
      </div>
      <p aria-live="polite" className="mt-3 text-center text-base text-foreground/60">
        {getCharacter(picked).name}
      </p>

      <div
        role="radiogroup"
        aria-label="Character"
        onKeyDown={(e) => {
          const by = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
          if (by) {
            e.preventDefault();
            move(by);
          }
        }}
        className="mx-auto mt-[22px] flex w-[315px] flex-wrap justify-center gap-x-[33px] gap-y-[20px]"
      >
        {CHARACTERS.map((c) => {
          const on = c.id === picked;
          return (
            <button
              key={c.id}
              id={`character-${c.id}`}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setPicked(c.id)}
              data-cuelume-select=""
              className="group flex w-[83px] flex-col items-center gap-[5px] focus-visible:outline-none"
            >
              <span
                className={cn(
                  "flex h-[75px] w-[79px] items-center justify-center transition-colors group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-foreground",
                  on ? "bg-tile-active text-tile-active-ink" : "bg-tile text-tile-ink group-hover:text-tile-active",
                )}
              >
                <CharacterSprite character={c.id} pixel={4} playing={on} />
              </span>
              <span className={cn("text-sm leading-[18px]", on ? "text-foreground" : "text-label")}>{c.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex justify-center pb-[33px] pt-8">
        <button
          type="button"
          onClick={() => onSave(picked)}
          data-cuelume-tap="success"
          disabled={saving}
          className="inline-flex min-h-[45px] w-[332px] items-center justify-center bg-foreground px-6 text-base text-accent-foreground transition-opacity hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-40"
        >
          {saving ? "SAVING…" : "SAVE"}
        </button>
      </div>
    </div>
  );
}
