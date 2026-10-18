"use client";

import { useEffect, useRef, useState } from "react";
import { CALL_INTENTS, saveRadioSettings, useRadioSettings } from "@/lib/radio-settings";
import { cn } from "../ui/cn";
import { Row, SettingsPanel } from "./RadioSettings";
import { ToggleSwitch } from "./ToggleSwitch";

/** Why someone gets reported. Short, so each fits a console key. */
export const REPORT_REASONS = ["Harassment", "Sexual content", "Hate or slurs", "Something else"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type RadioCallSettingsProps = {
  open: boolean;
  /** Who you're on the call with. */
  peer: string;
  /** Pause the call (the other person hears you're taking a break). */
  onBreak: boolean;
  onBreakChange: (on: boolean) => void;
  /** Reported: the radio hangs up, and you're never matched with them again. */
  onReport: (reason: ReportReason) => void;
  className?: string;
};

/**
 * Settings during a call (copy doc: "hang up any time, report", "@Jhfnx is taking a break"), plus
 * your intent (what you're here for), the same four the radio matches on.
 * Report swaps the panel for a reason picker; picking one confirms, then hangs up.
 */
export function RadioCallSettings({ open, peer, onBreak, onBreakChange, onReport, className }: RadioCallSettingsProps) {
  const { intent } = useRadioSettings();
  // Which screen of the panel, per call: a new call (or closing the panel) starts back at the main view.
  const [screen, setScreen] = useState<{ peer: string; view: "main" | "report" | ReportReason }>({ peer, view: "main" });
  const view = open && screen.peer === peer ? screen.view : "main";
  const setView = (next: "main" | "report" | ReportReason) => setScreen({ peer, view: next });

  // After the confirmation has shown for a moment, hang up. (A ref, so the radio re-rendering doesn't restart the wait.)
  const reportRef = useRef(onReport);
  useEffect(() => {
    reportRef.current = onReport;
  });
  useEffect(() => {
    if (view === "main" || view === "report") return;
    const t = setTimeout(() => reportRef.current(view), 1600);
    return () => clearTimeout(t);
  }, [view]);

  if (view === "report") {
    return (
      <SettingsPanel open={open} label={`Report ${peer}`} title={`REPORT ${peer}`} className={className}>
        <p className="mt-1 px-1 text-[11px] normal-case text-label/80">What happened? They won&apos;t know it was you.</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => setView(reason)}
              data-cuelume-tap=""
              className="flex h-11 items-center justify-center text-[11px] font-bold uppercase opacity-90 [background:var(--button-gradient)] shadow-[var(--button-highlight)] hover:brightness-110"
            >
              {reason}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setView("main")}
          className="mt-1 h-11 self-center px-4 text-[11px] font-bold uppercase text-label/80 hover:text-foreground"
        >
          Cancel
        </button>
      </SettingsPanel>
    );
  }

  if (view !== "main") {
    return (
      <SettingsPanel open={open} label={`Reported ${peer}`} title="REPORTED" className={className}>
        <div role="status" className="flex flex-1 flex-col items-center justify-center gap-2 px-4 pb-6 text-center">
          <p className="text-[13px] font-bold uppercase opacity-80">Thanks. We&apos;ll review it.</p>
          <p className="text-[11px] normal-case text-label/80">
            Hanging up. You won&apos;t be matched with {peer} again.
          </p>
        </div>
      </SettingsPanel>
    );
  }

  return (
    <SettingsPanel open={open} label="Call settings" title={`ON CALL WITH ${peer}`} className={className}>
      <Row label="Take a break">
        <ToggleSwitch on={onBreak} onChange={onBreakChange} label="Take a break" />
      </Row>
      <Row label="Here to">
        {/* Same four intents as matching. Changing it mid-call keeps this call; it's who you meet next. */}
        <div role="radiogroup" aria-label="What you're here for" className="grid w-[256px] grid-cols-4 gap-1">
          {CALL_INTENTS.map((t) => {
            const on = intent === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={t.label}
                onClick={() => saveRadioSettings({ intent: t.id })}
                data-cuelume-select=""
                className={cn(
                  "flex h-10 items-center justify-center px-0.5 text-center text-[11px] font-bold uppercase leading-tight",
                  // Picked: pressed in and lit, like the console's active keys.
                  on
                    ? "text-[var(--key-lit)] [background:var(--button-gradient-pressed)] [filter:var(--key-lit-glow)] shadow-[var(--button-pressed-shadow)]"
                    : "opacity-80 [background:var(--button-gradient)] shadow-[var(--button-highlight)] hover:brightness-110",
                )}
              >
                {t.key}
              </button>
            );
          })}
        </div>
      </Row>
      <Row label={<span className="normal-case">REPORT {peer}</span>}>
        <button
          type="button"
          onClick={() => setView("report")}
          data-cuelume-tap=""
          className="flex h-8 items-center px-3 text-[11px] font-bold uppercase text-danger [background:var(--button-gradient)] shadow-[var(--button-highlight)] hover:brightness-110"
        >
          Report
        </button>
      </Row>
    </SettingsPanel>
  );
}
