"use client";

import { Radio_Canada_Big } from "next/font/google";
import { useSyncExternalStore } from "react";
import { currentFlow, PANEL_FLOWS, requestFlow, subscribeGuide } from "@/lib/guide";
import "./about-panel.css";

/*
  The submission view on a wide screen, and the only panel there: what Caravan is, the flows to
  play (the six guided ones, then All flows to explore freely), and who made it. Hidden below lg
  (1024px), so a real phone only ever shows the app (and keeps the two-finger hold for switching
  flows). The phone stage leaves room for it (.device-stage in globals.css, and DeviceFrame's fit).
  Picking a flow here starts it on the phone (DialKit does the starting). Look: about-panel.css
  (a floating card, grey-value hierarchy, after naheeljawaid.com and rachelchen.tech).
*/

/** Width of the column, in px. DeviceFrame and globals.css use the same number. */
export const ABOUT_WIDTH = 360;

const TAGLINE = "Stories told by everyone on the road tonight.";
/** The intro (about-panel.css, after naheeljawaid.com): when the tagline's words start, and the gap between them, in ms. */
const WORDS_AT = 260;
const WORD_STEP = 55;

/** The team, each name linking to their own site. */
const TEAM = [
  { name: "Jennifer", href: "https://hfyj-art.com" },
  { name: "Emily", href: "https://shenemily.com/" },
  { name: "Angelina", href: "https://www.angelinawwu.com/" },
];

// Naheel's typeface. Loaded for this panel only; the app itself stays in Geist Mono.
const radioCanadaBig = Radio_Canada_Big({ subsets: ["latin"], weight: ["400", "500"] });

export function AboutPanel() {
  // The flow playing now, for the green square.
  const playing = useSyncExternalStore(subscribeGuide, currentFlow, () => null);
  return (
    <aside aria-label="About Caravan" className={`about-panel ap-panel ${radioCanadaBig.className}`}>
      <header>
        {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG, nothing to optimise */}
        <img src="/caravan-logo.svg" alt="" aria-hidden="true" className="ap-logo" />
        <h1 className="ap-title">Caravan</h1>
        {/* Word by word out of a blur, after naheeljawaid.com's "Select a project". */}
        <p className="ap-lead" aria-label={TAGLINE}>
          {TAGLINE.split(" ").map((w, i) => (
            <span key={i} aria-hidden className="ap-word" style={{ animationDelay: `${WORDS_AT + i * WORD_STEP}ms` }}>
              {w}{" "}
            </span>
          ))}
        </p>
        <p className="ap-about">
          A storytelling app for the road, guided by voice so your eyes stay on it. Hear stories drivers left at real
          spots on your route, leave your own, and late at night, talk to a stranger whose road overlaps yours.
        </p>
      </header>

      <div className="ap-spacer" />

      {/* data-guide-flow is where the guide's bubble points when a flow ends (Flow 6 → All flows). */}
      <section aria-label="Play a flow" className="ap-section">
        <span className="ap-heading">Play a flow</span>
        <ol className="ap-list">
          {PANEL_FLOWS.map((f) => (
            <li key={f.n}>
              <button
                type="button"
                data-guide-flow={f.n}
                aria-current={f.n === playing || undefined}
                onClick={() => requestFlow(f.n)}
                className="ap-item"
              >
                {f.title}
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Team" className="ap-section">
        <span className="ap-heading">Team</span>
        <span>
          {TEAM.map((m, i) => (
            <span key={m.name}>
              {i > 0 && ", "}
              <a href={m.href} target="_blank" rel="noopener noreferrer" className="ap-link">
                {m.name}
              </a>
            </span>
          ))}
        </span>
      </section>

      <p className="ap-footer">SVSD Design Competition, Fall 2026</p>
    </aside>
  );
}
