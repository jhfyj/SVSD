import { cn } from "../ui/cn";

export function Led({ on, className }: { on: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 rounded-full",
        on ? "bg-led shadow-[0_0_6px_var(--led)]" : "bg-surface-raised",
        className,
      )}
    />
  );
}
