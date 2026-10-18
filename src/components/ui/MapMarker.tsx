import { cn } from "./cn";

export type MarkerColor = "lime" | "sky" | "magenta" | "orange";

const colors: Record<MarkerColor, string> = {
  lime: "bg-marker-lime",
  sky: "bg-marker-sky",
  magenta: "bg-marker-magenta",
  orange: "bg-marker-orange",
};

export function MapMarker({ color, label, className }: { color: MarkerColor; label?: string; className?: string }) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-block size-4 border-2 border-marker-border", colors[color], className)}
    />
  );
}
