"use client";

import { PLANS, type PlanId } from "@/lib/profile/plan";
import { cn } from "../ui/cn";

export type SubscriptionProps = {
  /** The account's plan right now. */
  plan: PlanId;
  /** Upgrade to Caravan+ or cancel back to Free (mocked: nothing is charged). */
  onChange?: (plan: PlanId) => void;
};

/**
 * Profile → Subscription: the three tiers from the deck's money slide, one bordered card each.
 * The plan you're on gets the same green square and glow as a picked character or language.
 * Caravan+ is the only one you can switch to yourself; Enterprise comes through your carrier.
 * Kept short enough that all three fit above the tab bar on a 393×852 screen.
 */
export function Subscription({ plan, onChange }: SubscriptionProps) {
  return (
    <div className="flex flex-col gap-3">
      {PLANS.map((p) => {
        const current = p.id === plan;
        return (
          <section
            key={p.id}
            aria-label={p.name}
            aria-current={current || undefined}
            className={cn(
              "flex flex-col gap-1 border p-3 transition-colors duration-150 ease-out",
              current ? "border-foreground/70" : "border-border",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "size-2 shrink-0 transition-colors duration-150 ease-out",
                  current ? "bg-character-lit shadow-[0_0_6px_var(--character-lit)]" : "bg-transparent",
                )}
              />
              <h2 className="text-base uppercase">{p.name}</h2>
              {current && <span className="text-xs uppercase text-foreground/70">Current</span>}
              <span className="ml-auto text-sm uppercase tabular-nums text-foreground/70">{p.price}</span>
            </div>
            <p className="pl-4 text-xs leading-4 text-foreground/70">{p.blurb}</p>

            {p.id === "plus" && (
              <div className="flex justify-end pt-1">
                {current ? (
                  <button
                    type="button"
                    onClick={() => onChange?.("free")}
                    className="min-h-8 text-xs uppercase text-foreground/70 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-foreground"
                  >
                    Cancel Caravan+
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onChange?.("plus")}
                    data-cuelume-tap="success"
                    className="inline-flex min-h-8 items-center bg-foreground px-3 text-xs uppercase text-accent-foreground transition-opacity duration-150 ease-out hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  >
                    Upgrade
                  </button>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
