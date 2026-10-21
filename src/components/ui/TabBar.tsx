"use client";

import { ClockCounterClockwise, PaperPlaneTilt, User, type Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { cn } from "./cn";
import { usePressTilt } from "./usePressTilt";

export type Tab = "journey" | "history" | "profile";

const TABS: { id: Tab; href: string; label: string; icon: Icon }[] = [
  { id: "journey", href: "/", label: "Journey", icon: PaperPlaneTilt },
  { id: "history", href: "/history", label: "History", icon: ClockCounterClockwise },
  { id: "profile", href: "/profile", label: "Profile", icon: User },
];

/**
 * Bottom nav bar (Figma 179:339): three console keys flush along the bottom of the column, sticky
 * while the screen scrolls. Put it last in the column, after a flex-1 (or mt-auto) part that pushes
 * it down on short screens. The current tab stays latched down like a radio preset, its icon at full
 * strength; the others stand up with their icons at 40%. Pressing a key tips it back toward your
 * finger, the same press as the Start your journey square.
 */
export function TabBar({ current, className }: { current?: Tab; className?: string }) {
  return (
    <nav
      aria-label="Main"
      // The housing: what shows round a key's edges as it tips back.
      className={cn(
        "sticky bottom-0 z-10 flex w-full pb-[var(--safe-bottom,env(safe-area-inset-bottom))] [background:var(--button-gradient-pressed)] shadow-[var(--button-pressed-shadow)]",
        className,
      )}
    >
      {TABS.map((tab) => (
        <TabKey key={tab.id} {...tab} selected={tab.id === current} />
      ))}
    </nav>
  );
}

function TabKey({ href, label, icon: Glyph, selected }: (typeof TABS)[number] & { selected: boolean }) {
  const { face, shade, held, handlers } = usePressTilt<HTMLSpanElement>({ tilt: 6, sink: 2, perspective: 320 });
  const down = selected || held;
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={selected ? "page" : undefined}
      data-cuelume-tap=""
      data-cuelume-theme="mech"
      {...handlers}
      className="group h-[70px] flex-1 touch-manipulation select-none outline-none"
    >
      <span
        ref={face}
        className={cn(
          "relative flex size-full flex-col items-center justify-center gap-1 overflow-hidden transition-[box-shadow,filter] duration-75 ease-out",
          "group-focus-visible:outline-2 group-focus-visible:-outline-offset-4 group-focus-visible:outline-foreground",
          down
            ? "[background:var(--button-gradient-pressed)] shadow-[var(--button-pressed-shadow)]"
            : "[background:var(--button-gradient)] shadow-[var(--button-highlight)] group-hover:brightness-110",
        )}
      >
        <span ref={shade} aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 ease-out" />
        <Glyph size={22} aria-hidden className={cn("relative text-foreground", !selected && "opacity-40")} />
        <span className={cn("text-[10px] leading-3", !selected && "text-foreground/40")}>{label}</span>
      </span>
    </Link>
  );
}
