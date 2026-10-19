"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";

const FRAME_WIDTH = 430;
const FRAME_HEIGHT = 880;
const SCREEN_WIDTH = 393;
const SCREEN_HEIGHT = 852;

/** Centers the app in the supplied phone frame and scales both together to fit the viewport. */
export function DeviceFrame({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const fit = () => {
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      setScale(Math.min(1, (width - 32) / FRAME_WIDTH, (height - 48) / FRAME_HEIGHT));
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
          </div>
        </div>
      </div>
    </div>
  );
}
