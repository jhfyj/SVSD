import { cn } from "./cn";

export type StatCardProps = {
  value: string | number;
  label: string;
  className?: string;
};

/** Profile stat (Figma node 123:635): big number left, small label bottom right. */
export function StatCard({ value, label, className }: StatCardProps) {
  return (
    <div className={cn("flex items-end justify-between bg-surface p-3", className)}>
      <span className="text-2xl">{value}</span>
      <span className="text-xs text-foreground/60">{label}</span>
    </div>
  );
}
