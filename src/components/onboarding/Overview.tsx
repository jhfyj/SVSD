"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { cn } from "@/components/ui/cn";
import { AvatarsScene, CompanyScene, StoriesScene } from "./OverviewScenes";

/*
  The three overview cards after sign-in (video script, flow 1): the same frame as the sign-in
  screens, with the green LCD on top playing a little scene, one line under it, and NEXT.
*/

export type OverviewStep = 1 | 2 | 3;

const CARDS: Record<OverviewStep, { title: string; label: string; scene: ReactNode }> = {
  1: {
    title: "Listen and plant stories and questions along your road.",
    label: "A car driving past stories, questions and tips left on the road",
    scene: <StoriesScene />,
  },
  2: {
    title: "Flip on Company to talk to a real stranger with the same mood and distance as you.",
    label: "A truck and an SUV driving side by side",
    scene: <CompanyScene />,
  },
  3: {
    title: "Pick a handle and avatar to stay anonymous.",
    label: "The avatars, one after another",
    scene: <AvatarsScene />,
  },
};

export type OverviewProps = {
  step: OverviewStep;
  /** Where NEXT goes on the last card. */
  doneHref?: string;
};

export function Overview({ step, doneHref = "/" }: OverviewProps) {
  const card = CARDS[step];
  const next = step < 3 ? `/overview?step=${step + 1}` : doneHref;
  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background text-foreground">
      <div className="flex flex-1 flex-col pt-[98px]">
        <div className="flex flex-1 flex-col items-center">
          <div
            role="img"
            aria-label={card.label}
            className="flex h-[130px] w-[221px] items-center justify-center overflow-hidden bg-lcd text-lcd-ink shadow-[var(--lcd-inset)]"
          >
            {card.scene}
          </div>
          <h1 key={step} className="mt-[85px] w-[293px] text-center text-xl uppercase">
            <ScrambleText>{card.title.toUpperCase()}</ScrambleText>
          </h1>
        </div>
        <div className="flex items-center justify-between pb-14 pl-[30px] pr-[30px] pt-8">
          <div className="flex gap-2" aria-label={`Card ${step} of 3`}>
            {([1, 2, 3] as const).map((n) => (
              <span key={n} aria-hidden className={cn("size-2", n === step ? "bg-foreground" : "bg-foreground/25")} />
            ))}
          </div>
          <Link
            href={next}
            data-cuelume-tap=""
            className="inline-flex min-h-11 min-w-[125px] items-center justify-center bg-foreground px-6 py-3 text-base text-accent-foreground transition-opacity duration-150 ease-out hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <span className="flex items-center gap-2">
              NEXT
              <ArrowRight size={16} aria-hidden />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
