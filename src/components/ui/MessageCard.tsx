import type { ReactNode } from "react";
import { cn } from "./cn";

export type MessageCardProps = {
  kind: "message" | "question";
  from: string;
  time?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Incoming message or question from another traveller. */
export function MessageCard({ kind, from, time, children, actions, className }: MessageCardProps) {
  return (
    <article className={cn("flex flex-col gap-3 border border-border bg-surface p-4 uppercase", className)}>
      <header className="flex items-center justify-between text-[11px]">
        <span className="font-bold text-label/80">{kind === "question" ? "Question" : "Message"} · {from}</span>
        {time && <span className="text-foreground/50">{time}</span>}
      </header>
      <p className="text-base leading-snug text-foreground/85">{children}</p>
      {actions && <div className="flex gap-2">{actions}</div>}
    </article>
  );
}
