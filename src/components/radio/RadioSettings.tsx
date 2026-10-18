"use client";

import type { ReactNode } from "react";
import { saveRadioSettings, useRadioSettings } from "@/lib/radio-settings";
import { cn } from "../ui/cn";
import { ToggleSwitch } from "./ToggleSwitch";

/** Height of the open panel, in device px. */
export const SETTINGS_HEIGHT = 196;

/**
 * The radio's settings, on the console itself: the bottom section grows up over the map
 * in steps when Settings is pressed, and folds back down when it's pressed again.
 * This is the radio-off set; during a call the same panel holds RadioCallSettings.
 */
export function RadioSettings({ open, className }: { open: boolean; className?: string }) {
  const { questions, surprises, frequency } = useRadioSettings();
  return (
    <SettingsPanel open={open} label="Radio settings" title="SETTINGS" className={className}>
      <Row label="Enable questions">
        <ToggleSwitch on={questions} onChange={(on) => saveRadioSettings({ questions: on })} label="Enable questions" />
      </Row>
      <Row label="Enable surprises">
        <ToggleSwitch on={surprises} onChange={(on) => saveRadioSettings({ surprises: on })} label="Enable surprises" />
      </Row>
      <Row label="How often">
        <div className="flex items-center gap-2 text-[11px] uppercase text-label/80">
          <span aria-hidden>Less</span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={frequency}
            onChange={(e) => saveRadioSettings({ frequency: Number(e.target.value) })}
            aria-label="How often"
            data-cuelume-select=""
            className={cn(
              "h-11 w-[104px] cursor-pointer appearance-none bg-transparent",
              "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-background [&::-webkit-slider-runnable-track]:shadow-[inset_1px_2px_3px_rgb(0_0_0/0.6)]",
              "[&::-webkit-slider-thumb]:-mt-[6px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:[background:var(--button-gradient)] [&::-webkit-slider-thumb]:shadow-[var(--button-highlight)]",
              "[&::-moz-range-track]:h-2 [&::-moz-range-track]:bg-background [&::-moz-range-track]:shadow-[inset_1px_2px_3px_rgb(0_0_0/0.6)]",
              "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:[background:var(--button-gradient)] [&::-moz-range-thumb]:shadow-[var(--button-highlight)]",
            )}
          />
          <span aria-hidden>More</span>
        </div>
      </Row>
    </SettingsPanel>
  );
}

/** The panel itself: casing that grows up from the console, content pinned to its bottom edge. */
export function SettingsPanel({
  open,
  label,
  title,
  height = SETTINGS_HEIGHT,
  className,
  children,
}: {
  open: boolean;
  label: string;
  title: ReactNode;
  /** Open height in px; the in-call panel is a little taller for its 2x2 intent keys. */
  height?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      aria-hidden={!open}
      inert={!open}
      className={cn(
        // z-10: the panel rises over the map, so the map's corner "i" (credits) and route pins stay underneath.
        "absolute inset-x-0 z-10 overflow-hidden transition-[clip-path] duration-200 ease-[steps(4)] motion-reduce:transition-none",
        "[background:var(--panel-noise),var(--casing-gradient)] shadow-[var(--panel-highlight)]",
        className,
      )}
      // Revealed from the bottom edge up by clipping (not by animating height), in 4 hard steps.
      style={{ height, clipPath: open ? "inset(0)" : "inset(100% 0 0 0)" }}
    >
      {/* Content pinned to the bottom, so it rises into view with the panel's top edge. */}
      <div className="absolute inset-x-[26px] bottom-0 flex flex-col" style={{ height }}>
        <span className="mt-[20px] px-1 text-[11px] font-bold text-label/80">{title}</span>
        {children}
      </div>
    </section>
  );
}

export function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-12 items-center justify-between border-b border-black/20 px-1 last:border-b-0">
      <span className="text-[13px] font-bold uppercase opacity-80">{label}</span>
      {children}
    </div>
  );
}
