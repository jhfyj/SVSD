"use client";

import { IconChevronDown } from "nucleo-pixel-essential";
import { useEffect, useRef, useState } from "react";
import { LANGUAGES, type LanguageId } from "@/lib/profile/language";
import { cn } from "../ui/cn";
import { PixelIcon } from "./LcdIcon";

export type LanguageSettingProps = {
  value: LanguageId;
  onChange: (language: LanguageId) => void;
  /** Starts the earth's float out of step with the rows above it. */
  delay?: number;
};

/**
 * The Language row in Settings: same frame as a permission row (LCD icon, label, one line on what
 * it does), with a dropdown where the switch would be. The list opens above the row, over the page,
 * each language in its own script with the English name beside it; the picked one has the same
 * green square as Pick language. Picking saves at once and closes it. Escape or a tap outside
 * closes it too.
 */
export function LanguageSetting({ value, onChange, delay = 1200 }: LanguageSettingProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLLIElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = LANGUAGES.find((l) => l.id === value) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    document.getElementById(`setting-language-${value}`)?.focus({ preventScroll: true });
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, value]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };

  const focusBy = (by: number) => {
    const ids = LANGUAGES.map((l) => `setting-language-${l.id}`);
    const at = ids.indexOf(document.activeElement?.id ?? "");
    const next = ids[(at + by + ids.length) % ids.length];
    document.getElementById(next)?.focus({ preventScroll: true });
  };

  return (
    <li ref={root} className="relative flex flex-col gap-2">
      <div className="flex items-center gap-3 border border-border p-3">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center bg-lcd text-lcd-ink shadow-[var(--lcd-inset)]">
          <PixelIcon icon="language" pixel={2} delay={delay} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-base leading-5">LANGUAGE</span>
          <span className="text-xs text-foreground/70">Who you pair with.</span>
        </div>
        <button
          ref={trigger}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Language: ${current.english}`}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          data-cuelume-tap=""
          className={cn(
            "flex h-9 shrink-0 items-center gap-1.5 border px-2 text-sm transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-foreground",
            open ? "border-foreground" : "border-border-input hover:border-foreground/70",
          )}
        >
          <span className="max-w-[88px] truncate">{current.name}</span>
          <IconChevronDown aria-hidden size={12} className={cn("shrink-0 transition-transform duration-150 ease-out", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <ul
          role="listbox"
          aria-label="Language"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              focusBy(1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              focusBy(-1);
            } else if (e.key === "Tab") {
              setOpen(false);
            }
          }}
          // Opens upward over the permission rows: below the row there's only DONE, and 7 languages
          // would run into it.
          className="absolute inset-x-0 bottom-full z-20 mb-1 flex flex-col border border-foreground bg-background shadow-[0_-8px_24px_rgb(0_0_0/0.35)]"
        >
          {LANGUAGES.map((l) => {
            const on = l.id === value;
            return (
              <li key={l.id} className="border-b border-border last:border-b-0">
                <button
                  id={`setting-language-${l.id}`}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    onChange(l.id);
                    close();
                  }}
                  data-cuelume-tap={on ? "" : "success"}
                  className="group flex h-10 w-full items-center gap-3 px-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
                >
                  <span
                    aria-hidden
                    className={cn("size-2 shrink-0", on ? "bg-character-lit shadow-[0_0_6px_var(--character-lit)]" : "bg-transparent")}
                  />
                  <span className={cn("flex-1 text-base leading-5", on ? "text-foreground" : "text-label group-hover:text-foreground/70")}>{l.name}</span>
                  {l.english !== l.name && <span className="text-xs text-foreground/40">{l.english}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
