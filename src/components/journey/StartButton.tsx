"use client";

import Link from "next/link";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { cn } from "@/components/ui/cn";
import { usePressTilt } from "@/components/ui/usePressTilt";

/** The big square on the start screen. Pressing it tips it back toward your finger, like the tab bar keys. */
export function StartButton({ href }: { href: string }) {
  const { face, held, handlers } = usePressTilt<HTMLSpanElement>({ tilt: 8, sink: 6, perspective: 600 });
  return (
    <Link
      href={href}
      data-cuelume-tap=""
      data-cuelume-theme="mech"
      {...handlers}
      className="group flex touch-manipulation select-none flex-col items-center gap-[22px] uppercase outline-none"
    >
      <span className="text-xl"><ScrambleText>Start your journey</ScrambleText></span>
      <span
        ref={face}
        className={cn(
          "flex size-[247px] items-center justify-center border border-foreground/80 transition-colors duration-150 ease-out group-hover:bg-surface",
          "group-focus-visible:bg-surface group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-foreground",
          held && "bg-surface",
        )}
      >
        <svg aria-hidden viewBox="0 0 64 64" className={cn("size-16 stroke-foreground transition-opacity duration-75 ease-out", held && "opacity-80")} strokeWidth={3}>
          <path d="M32 16v32M16 32h32" />
        </svg>
      </span>
    </Link>
  );
}
