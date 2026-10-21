"use client";

import { useEffect, useRef } from "react";
import "./glass-cursor.css";

/*
  The laptop cursor: a round glass lens instead of the arrow (Jennifer's reference). Only where
  there is a real mouse or trackpad (hover + fine pointer), so phones and the filmed site never
  see it. It follows the pointer, swells a little over anything you can tap (it replaces the
  pointing hand), presses in on mouse down and springs back on release.
*/

const TAPPABLE = "button, a[href], input, textarea, select, label, summary, [role='switch'], [role='radio'], [role='button'], [role='tab'], [data-guide-flow]";
const FINE = "(hover: hover) and (pointer: fine)";

export function GlassCursor() {
  const outer = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = matchMedia(FINE);
    const root = document.documentElement;
    let off: (() => void) | undefined;

    const start = () => {
      off?.();
      off = undefined;
      if (!mq.matches || !outer.current || !lens.current) return root.classList.remove("glass-cursor-on");
      root.classList.add("glass-cursor-on");
      const o = outer.current;
      const l = lens.current;

      const move = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        o.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        o.classList.add("is-live");
        const el = e.target instanceof Element ? e.target : null;
        const hot = !!el?.closest(TAPPABLE) && !el.closest(":disabled, [aria-disabled='true']");
        l.classList.toggle("is-hot", hot);
      };
      const down = (e: PointerEvent) => {
        if (e.pointerType !== "touch") l.classList.add("is-down");
      };
      const up = () => l.classList.remove("is-down");
      const leave = () => o.classList.remove("is-live");

      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerdown", down, { passive: true });
      window.addEventListener("pointerup", up, { passive: true });
      window.addEventListener("blur", up);
      document.addEventListener("pointerleave", leave);
      root.addEventListener("mouseleave", leave);
      off = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerdown", down);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("blur", up);
        document.removeEventListener("pointerleave", leave);
        root.removeEventListener("mouseleave", leave);
      };
    };

    start();
    mq.addEventListener("change", start);
    return () => {
      mq.removeEventListener("change", start);
      off?.();
      root.classList.remove("glass-cursor-on");
    };
  }, []);

  return (
    <div ref={outer} className="glass-cursor" aria-hidden>
      <div ref={lens} className="glass-cursor-lens" />
    </div>
  );
}
