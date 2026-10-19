"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { ABOUT_WIDTH } from "./AboutPanel";

const FRAME_WIDTH = 430;
const FRAME_HEIGHT = 880;
const SCREEN_WIDTH = 393;
const SCREEN_HEIGHT = 852;
/** On a wide screen (a laptop), zoomed out a little so more of the starry backdrop shows round the phone. */
const WIDE = 1024;
const WIDE_MAX_SCALE = 0.86;
/** Room kept above and below the phone, in px: more on a wide screen. */
const WIDE_EDGE_Y = 160;
const EDGE_Y = 48;

/** Centers the app in the supplied phone frame and scales both together to fit the viewport. */
export function DeviceFrame({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const fit = () => {
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const wide = width >= WIDE;
      // On a wide screen the About column takes the left edge; the phone fits in what is left.
      const room = wide ? width - ABOUT_WIDTH : width;
      setScale(Math.min(wide ? WIDE_MAX_SCALE : 1, (room - 32) / FRAME_WIDTH, (height - (wide ? WIDE_EDGE_Y : EDGE_Y)) / FRAME_HEIGHT));
    };
    fit();
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <div className="device-stage">
      <div className="device-frame-scale" style={{ width: FRAME_WIDTH * scale, height: FRAME_HEIGHT * scale }}>
        <div className="device-frame" style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT, transform: `scale(${scale})` }}>
          <img className="device-frame-art" src="/device-frame.png" alt="" aria-hidden="true" />
          <div
            className="device-screen"
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, left: (FRAME_WIDTH - SCREEN_WIDTH) / 2, top: (FRAME_HEIGHT - SCREEN_HEIGHT) / 2 }}
          >
            <div className="device-screen-content">{children}</div>
            <DeviceStatusBar />
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceStatusBar() {
  return (
    <div className="device-status-bar" role="group" aria-label="iPhone status bar, 9:41">
      <span className="device-status-notch" aria-hidden="true">
        <span className="device-status-lens" />
      </span>
      <div className="device-status-items">
        <time className="device-status-time">9:41</time>
        <span className="device-status-icons" aria-hidden="true">
          <svg viewBox="0 0 18 14" width="20" height="16" fill="currentColor">
            <path d="M1 13h2V9H1zm4 0h2V6H5zm4 0h2V3H9zm4 0h2V1h-2z" />
          </svg>
          <svg viewBox="0 0 18 14" width="20" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 5.2a10 10 0 0 1 14 0M4.8 8a6 6 0 0 1 8.4 0M7.5 10.7a2.2 2.2 0 0 1 3 0" />
            <circle cx="9" cy="12" r=".8" fill="currentColor" stroke="none" />
          </svg>
          <svg viewBox="0 0 26 14" width="28" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="21" height="12" rx="3" />
            <path d="M24 5v4" strokeWidth="2" strokeLinecap="round" />
            <rect x="3" y="3" width="17" height="8" rx="1.5" fill="currentColor" stroke="none" />
          </svg>
        </span>
      </div>
    </div>
  );
}
