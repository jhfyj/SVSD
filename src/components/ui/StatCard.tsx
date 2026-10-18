import { cn } from "./cn";

export type StatCardProps = {
  value: string | number;
  label: string;
  className?: string;
};

export function StatCard({ value, label, className }: StatCardProps) {
  return (
    <div className={cn("flex flex-col gap-1 border border-border bg-surface p-4 uppercase", className)}>
      <span className="text-2xl">{value}</span>
      <span className="text-[11px] text-foreground/60">{label}</span>
    </div>
  );
}
