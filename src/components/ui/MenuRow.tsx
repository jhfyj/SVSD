import type { ReactNode } from "react";
import { cn } from "./cn";

export type MenuRowProps = {
  icon?: ReactNode;
  label: string;
  tone?: "default" | "danger";
  onClick?: () => void;
};

/** Profile menu entry: Settings, Report, Delete account. */
export function MenuRow({ icon, label, tone = "default", onClick }: MenuRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 px-1 py-3 text-left text-sm uppercase hover:bg-surface",
        tone === "danger" ? "text-danger" : "text-foreground/85",
      )}
    >
      {icon && <span className="flex size-5 items-center justify-center" aria-hidden>{icon}</span>}
      <span className="flex-1">{label}</span>
      {tone === "default" && <span aria-hidden className="text-foreground/40">›</span>}
    </button>
  );
}
