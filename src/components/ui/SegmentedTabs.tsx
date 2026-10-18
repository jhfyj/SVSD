"use client";

import { cn } from "./cn";

export type SegmentedTabsProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  className?: string;
};

/** Destination / Duration switch: a surface track with the selected tab raised. */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex bg-surface p-1", className)}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option)}
            className={cn(
              "min-h-11 flex-1 px-3 py-2 text-sm uppercase transition-colors",
              selected ? "bg-surface-raised text-foreground" : "text-foreground/70 hover:text-foreground",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
