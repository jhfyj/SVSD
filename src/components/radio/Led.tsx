import { cn } from "../ui/cn";

/** 8px indicator: a pale bulb in a grey ring, with a green glow when lit. */
export function Led({ on, className }: { on: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-block size-2", className)}>
      {on && <span className="absolute -inset-0.5 rounded-full bg-[#55ff60]/70 blur-[3px]" />}
      <span
        className={cn(
          "absolute inset-0 rounded-full border border-[#aeaeae]",
          on ? "bg-[radial-gradient(circle,#ffffff_0%,#fff280_100%)]" : "bg-[#3a3a3a]",
        )}
      />
    </span>
  );
}
