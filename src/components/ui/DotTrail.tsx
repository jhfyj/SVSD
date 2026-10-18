import { cn } from "./cn";

export type DotTrailProps = {
  /** Total dots in the route. */
  total: number;
  /** How many dots are lit (journey progress). */
  lit: number;
  className?: string;
};

/** The dotted route path; lit dots show how far the journey has come. */
export function DotTrail({ total, lit, className }: DotTrailProps) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={lit}
      className={cn("flex items-center gap-2", className)}
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("size-2.5 rounded-full", i < lit ? "bg-foreground" : "bg-foreground/20")} />
      ))}
    </div>
  );
}
