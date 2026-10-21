"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGES, type LanguageId } from "@/lib/profile/language";
import { cn } from "../ui/cn";

export type PickLanguageProps = {
  /** The language picked so far; English for a new account. */
  initial?: LanguageId;
  onSave: (language: LanguageId) => void;
  onBack?: () => void;
};

/**
 * Pick language: the sign-up step right after Customize profile. One list of languages, each in its
 * own script with the English name under it; the picked one lights up with the same green square
 * and glow as a picked character. The pick sets both the app's language and who you get paired with.
 * One phone screen tall, title row with a back arrow (dropped 40px so it clears the status bar), SAVE
 * pinned to the bottom edge.
 */
export function PickLanguage({ initial = DEFAULT_LANGUAGE, onSave, onBack }: PickLanguageProps) {
  const [picked, setPicked] = useState<LanguageId>(initial);

  const move = (by: number) => {
    const i = LANGUAGES.findIndex((l) => l.id === picked);
    const next = LANGUAGES[(i + by + LANGUAGES.length) % LANGUAGES.length];
    setPicked(next.id);
    document.getElementById(`language-${next.id}`)?.focus();
  };

  return (
    <div className="grain flex w-full max-w-[393px] flex-col bg-background text-foreground">
      <header className="relative mt-10 flex h-[26px] items-center justify-center">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="absolute left-[13px] flex size-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-foreground"
          >
            <ArrowLeft size={16} aria-hidden />
          </button>
        )}
        <h1 className="text-xl">PICK LANGUAGE</h1>
      </header>

      <p className="mx-auto mt-[29px] w-[315px] max-w-[calc(100%-24px)] text-base text-foreground/70">
        Sets the app’s language and who you get paired with on the road.
      </p>

      <div
        role="radiogroup"
        aria-label="Language"
        onKeyDown={(e) => {
          const by = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
          if (by) {
            e.preventDefault();
            move(by);
          }
        }}
        className="mx-auto mt-5 flex w-[315px] max-w-[calc(100%-24px)] flex-col"
      >
        {LANGUAGES.map((l) => {
          const on = l.id === picked;
          return (
            <button
              key={l.id}
              id={`language-${l.id}`}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setPicked(l.id)}
              data-cuelume-tap=""
              className="group flex min-h-[56px] items-center gap-4 border-b border-border-input text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
            >
              <span
                aria-hidden
                className={cn(
                  "size-2 shrink-0 transition-colors duration-150 ease-out",
                  on ? "bg-character-lit shadow-[0_0_6px_var(--character-lit)]" : "bg-transparent",
                )}
              />
              <span className="flex flex-col">
                <span className={cn("text-base leading-5", on ? "text-foreground" : "text-label group-hover:text-foreground/70")}>{l.name}</span>
                {l.english !== l.name && <span className="text-xs leading-4 text-foreground/40">{l.english}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex justify-center px-edge pb-edge-bottom pt-8">
        <button
          type="button"
          onClick={() => onSave(picked)}
          data-cuelume-tap="success"
          className="inline-flex min-h-[45px] w-full items-center justify-center bg-foreground px-6 text-base text-accent-foreground transition-opacity duration-150 ease-out hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          SAVE
        </button>
      </div>
    </div>
  );
}
