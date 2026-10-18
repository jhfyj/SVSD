import { cn } from "../ui/cn";

export type LedProps = {
  on: boolean;
  /** Green when the call is live, red when the connection is lost. */
  tone?: "live" | "error";
  /** Glow switches on and off (two frames), for connecting. */
  blink?: boolean;
  className?: string;
};

/** 8px indicator: a pale bulb in a grey ring, with a green glow when lit, or red on an error. */
export function Led({ on, tone = "live", blink, className }: LedProps) {
  const error = tone === "error";
  return (
    <span aria-hidden className={cn("relative inline-block size-2", className)}>
      {on && (
        <span
          className={cn(
            "absolute -inset-0.5 rounded-full blur-[3px]",
            error ? "bg-[#ff3535]/80" : "bg-[#55ff60]/70",
            blink && "caret-blink",
          )}
        />
      )}
      <span
        className={cn(
          "absolute inset-0 rounded-full border border-[#aeaeae]",
          !on
            ? "bg-[#3a3a3a]"
            : error
              ? "bg-[radial-gradient(circle,#ffd6d6_0%,#ff3535_100%)]"
              : "bg-[radial-gradient(circle,#ffffff_0%,#fff280_100%)]",
        )}
      />
    </span>
  );
}
