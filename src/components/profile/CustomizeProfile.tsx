"use client";

import { ArrowLeft, ShuffleSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { CHARACTERS, DEFAULT_CHARACTER, getCharacter, type CharacterId } from "@/lib/profile/characters";
import { cleanHandle, HANDLE_MAX, handleError, randomHandle } from "@/lib/profile/handle";
import { cn } from "../ui/cn";
import { CharacterSprite } from "./CharacterSprite";

export type CustomizeProfileProps = {
  /** The character picked so far; Freddie for a new account. */
  initial?: CharacterId;
  /** The handle so far, without the @. Left out (a new account): a random one to keep or change. */
  initialHandle?: string;
  onSave: (character: CharacterId, handle: string) => void;
  onBack?: () => void;
  saving?: boolean;
  /** Compact arrangement for the same working profile controls inside an overview LCD. */
  compact?: boolean;
};

/**
 * Customize profile (Figma node 154:1304): pick one of eight LCD pets and your @handle. The picked
 * pet lights up green and bobs in the grid and in the avatar up top; the others stay unlit pixels.
 * The handle starts as a random one (shuffle for another) and can be typed over.
 */
export function CustomizeProfile({ initial = DEFAULT_CHARACTER, initialHandle, onSave, onBack, saving, compact = false }: CustomizeProfileProps) {
  const [picked, setPicked] = useState<CharacterId>(initial);
  const [handle, setHandle] = useState(() => initialHandle ?? randomHandle());
  const error = handleError(handle);

  const move = (by: number) => {
    const i = CHARACTERS.findIndex((c) => c.id === picked);
    const next = CHARACTERS[(i + by + CHARACTERS.length) % CHARACTERS.length];
    setPicked(next.id);
    document.getElementById(`character-${next.id}`)?.focus();
  };

  return (
    <div className={cn("grain flex w-full flex-col bg-background text-foreground", compact ? "h-full" : "min-h-dvh max-w-[393px]")}>
      <header className={cn("relative flex h-[26px] items-center justify-center", compact ? "mt-2" : "mt-[59px]")}>
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
        <h1 className="text-xl">CUSTOMIZE PROFILE</h1>
      </header>

      <div className={cn("flex justify-center", compact ? "mt-2" : "mt-[29px]")}>
        <div className={cn("flex items-center justify-center overflow-hidden rounded-full bg-lcd-green text-lcd-green-ink shadow-[var(--lcd-inset)]", compact ? "size-[80px]" : "size-[106px]")}>
          <CharacterSprite key={picked} character={picked} pixel={compact ? 3.3 : 4.4} className="opacity-80" />
        </div>
      </div>
      <p aria-live="polite" className={cn("text-center text-foreground/70", compact ? "mt-1 text-sm" : "mt-3 text-base")}>
        {getCharacter(picked).name}
      </p>

      {/* Your @handle: what other drivers see. Starts random; type over it or shuffle. */}
      <div className={cn("mx-auto w-[315px] max-w-[calc(100%-24px)]", compact ? "mt-2" : "mt-6")}>
        <label htmlFor="handle" className="text-[11px] font-bold uppercase text-label/80">
          Username
        </label>
        <div
          className={cn(
            "mt-2 flex h-12 items-center border bg-transparent pl-3 focus-within:border-foreground",
            error ? "border-danger" : "border-border-input",
          )}
        >
          <span className="text-base text-foreground/40">@</span>
          <input
            id="handle"
            data-cuelume-type=""
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={HANDLE_MAX + 1}
            aria-invalid={!!error}
            aria-describedby={error ? "handle-error" : undefined}
            value={handle}
            onChange={(e) => setHandle(cleanHandle(e.target.value))}
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-foreground/40"
          />
          <button
            type="button"
            onClick={() => setHandle(randomHandle())}
            aria-label="Random username"
            title="Random username"
            data-cuelume-tap=""
            className="flex size-12 shrink-0 items-center justify-center text-foreground/70 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
          >
            <ShuffleSimple size={18} aria-hidden />
          </button>
        </div>
        {error && (
          <p id="handle-error" role="alert" className="mt-2 text-xs text-danger">
            {error}
          </p>
        )}
      </div>

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
        className={cn("mx-auto flex w-[315px] max-w-[calc(100%-24px)] flex-wrap justify-center", compact ? "mt-3 gap-x-2 gap-y-2" : "mt-[22px] gap-x-[33px] gap-y-[20px]")}
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
              className={cn("group flex flex-col items-center focus-visible:outline-none", compact ? "w-[70px] gap-1" : "w-[83px] gap-[5px]")}
            >
              <span
                className={cn(
                  "flex items-center justify-center transition-colors duration-150 ease-out group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-foreground",
                  compact ? "h-[56px] w-[64px]" : "h-[75px] w-[79px]",
                  on
                    ? "text-character-lit drop-shadow-[0_0_6px_var(--character-lit)]"
                    : "text-character group-hover:text-foreground/40",
                )}
              >
                <CharacterSprite character={c.id} pixel={compact ? 3 : 4} playing={on} />
              </span>
              <span className={cn(compact ? "text-xs leading-4" : "text-sm leading-[18px]", on ? "text-foreground" : "text-label")}>{c.name}</span>
            </button>
          );
        })}
      </div>

      <div className={cn("mt-auto flex justify-center", compact ? "pb-2 pt-2" : "px-edge pb-edge-bottom pt-8")}>
        <button
          type="button"
          onClick={() => onSave(picked, handle)}
          data-cuelume-tap="success"
          disabled={saving || !!error}
          className={cn("inline-flex items-center justify-center bg-foreground px-6 text-base text-accent-foreground transition-opacity duration-150 ease-out hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-40", compact ? "min-h-10 w-[315px] max-w-[calc(100%-24px)]" : "min-h-[45px] w-full")}
        >
          {saving ? "SAVING…" : "SAVE"}
        </button>
      </div>
    </div>
  );
}
