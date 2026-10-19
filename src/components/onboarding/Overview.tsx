"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { signOut } from "@/lib/auth/session";
import { AvatarsScene, CompanyScene, StoriesScene } from "./OverviewScenes";

export type OverviewStep = 1 | 2 | 3;

type OverviewCard = { title: string; subtitle: string; label: string; scene: ReactNode };

const CARDS: Record<OverviewStep, OverviewCard> = {
  1: {
    title: "Stories on the road",
    subtitle: "Pick up voice messages, questions, and tips as you drive.",
    label: "A route map shows a voice message, a question, and a tip being picked up",
    scene: <StoriesScene />,
  },
  2: {
    title: "Meet along the way",
    subtitle: "Turn on Company to connect with someone nearby who shares your mood.",
    label: "The Company switch turns on, searches nearby, and connects two drivers",
    scene: <CompanyScene />,
  },
  3: {
    title: "Be whoever you are",
    subtitle: "Choose a handle and avatar. Your real name stays private.",
    label: "The available profile avatars cycle one at a time",
    scene: <AvatarsScene />,
  },
};

export type OverviewProps = {
  step: OverviewStep;
  /** Where NEXT goes on the last card: sign in with your number, then pick your avatar (flow 1). */
  doneHref?: string;
};

export function Overview({ step, doneHref = "/profile?welcome=1" }: OverviewProps) {
  const card = CARDS[step];
  const next = step < 3 ? `/overview?step=${step + 1}` : doneHref;
  const startsSignUp = step === 3;

  return (
    <div className="grain flex min-h-dvh w-full flex-col bg-background px-[18px] pb-6 pt-5 text-foreground">
      <main className="flex flex-1 flex-col gap-5">
        <div
          role="group"
          aria-label={card.label}
          className="flex h-[62dvh] min-h-[360px] max-h-[520px] w-full items-stretch justify-stretch overflow-hidden bg-lcd text-lcd-ink shadow-[var(--lcd-inset)]"
        >
          {card.scene}
        </div>
        <div key={step} className="overview-copy">
          <p className="font-mono text-base uppercase tracking-[0.16em] text-foreground/55">0{step}</p>
          <h1 className="mt-2 text-[28px] uppercase leading-[1.02] tracking-[-0.035em]">{card.title}</h1>
          <p className="mt-2 w-full text-lg leading-relaxed text-foreground/70">{card.subtitle}</p>
        </div>
      </main>
      <footer className="flex items-center justify-between pt-5">
        <div className="flex gap-1.5" aria-label={`Card ${step} of 3`}>
          {([1, 2, 3] as const).map((n) => (
            <span key={n} aria-hidden className={cn("h-1 w-7", n === step ? "bg-foreground" : "bg-foreground/20")} />
          ))}
        </div>
        <Link
          href={next}
          onClick={startsSignUp ? signOut : undefined}
          data-cuelume-tap=""
          className="inline-flex min-h-11 min-w-[125px] items-center justify-center bg-foreground px-6 py-3 text-base text-accent-foreground transition-colors duration-150 ease-out hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:scale-[0.98]"
        >
          <span className="flex items-center gap-2">{startsSignUp ? "LET’S GO" : "NEXT"}<ArrowRight size={16} aria-hidden /></span>
        </Link>
      </footer>
    </div>
  );
}
