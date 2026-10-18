import type { ReactNode } from "react";
import { cn } from "./cn";

export type MenuRowProps = {
  icon?: ReactNode;
  label: string;
  tone?: "default" | "danger";
  onClick?: () => void;
  /** A cuelume cue to play on click. Silent unless set: sound is kept for major interactions. */
  sound?: string;
};

/** Profile menu entry (Figma node 123:639): a bordered row with a 16px icon. */
export function MenuRow({ icon, label, tone = "default", onClick, sound }: MenuRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-cuelume-tap={sound}
      className={cn(
        "flex min-h-11 w-full items-center gap-2 border p-3 text-left uppercase transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        tone === "danger" ? "border-danger text-danger" : "border-border text-foreground",
      )}
    >
      {icon && <span className="flex size-4 items-center justify-center" aria-hidden>{icon}</span>}
      <span>{label}</span>
    </button>
  );
}
