"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  currentFlow,
  GUIDE_FLOWS,
  GUIDE_WIDE,
  guideActive,
  guideRun,
  subscribeGuide,
  type GuideContext,
  type GuideStep,
} from "@/lib/guide";
import "./guide.css";

/*
  The guided demo on the submission site (see lib/guide). While a flow plays on a wide screen,
  nothing is locked: every key, link and field in the phone works, and every flow in the About
  column can be played at any time. The guide only points the way: after IDLE_MS without a tap or
  key press, a round bubble pulses over the flow's next tap (or, once the flow is over, over the
  next flow in the About column).
*/

/** How long a visitor can sit still before the bubble shows. */
const IDLE_MS = 4000;
/** On a fresh page load, how long to leave React to hydrate before touching the page. */
const HYDRATE_MS = 1200;
/** How often the screen is looked at again. */
const TICK_MS = 200;

const OK_ATTR = "data-guide-ok";

export function Guide() {
  const path = usePathname();
  const params = useSearchParams();
  const flowN = useSyncExternalStore(subscribeGuide, currentFlow, () => null);
  const run = useSyncExternalStore(subscribeGuide, guideRun, () => 0);
  const [active, setActive] = useState(false);
  // The page's first load: wait until React has taken over the server's HTML before marking keys on it.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), HYDRATE_MS);
    return () => clearTimeout(t);
  }, []);
  const [bubble, setBubble] = useState<{ x: number; y: number; size: number; hint?: string } | null>(null);
  const step = useRef<GuideStep>({});
  const seen = useRef(new Set<string>());
  const lastTouch = useRef(0);
  const lastTarget = useRef<Element | null>(null);

  // On for the hosted site on a wide screen (re-checked when the window crosses the breakpoint).
  useEffect(() => {
    const mq = matchMedia(GUIDE_WIDE);
    const check = () => setActive(guideActive());
    check();
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, []);

  useEffect(() => {
    seen.current = new Set();
    lastTouch.current = Date.now();
  }, [run, flowN]);

  const flow = active && ready ? GUIDE_FLOWS.find((f) => f.n === flowN) : undefined;

  // Look at the screen, mark what's tappable, place the bubble.
  useEffect(() => {
    document.documentElement.classList.toggle("guide-on", !!flow);
    if (!flow) return;
    const screen = () => document.querySelector(".device-screen-content");
    // Seen = has a size, and is what's actually on top at its middle (not tucked behind the map or
    // a closed drawer). Clear ones (the code field's input) still count: they're on top.
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === "hidden") return false;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!hit && (el.contains(hit) || hit.contains(el));
    };
    const ctx: GuideContext = {
      path,
      params: new URLSearchParams(params.toString()),
      seen: seen.current,
      find: (selector, text) => {
        const all = Array.from(screen()?.querySelectorAll<HTMLElement>(selector) ?? []);
        return all.find((el) => visible(el) && (!text || text.test(el.textContent ?? ""))) ?? null;
      },
      findAll: (selector) => Array.from(screen()?.querySelectorAll<HTMLElement>(selector) ?? []).filter(visible),
      text: () => (screen() as HTMLElement | null)?.innerText ?? "",
    };
    const tick = () => {
      const next = flow.next(ctx);
      step.current = next;
      document.querySelectorAll(`[${OK_ATTR}]`).forEach((el) => el.removeAttribute(OK_ATTR));
      [next.target, ...(next.allow ?? [])].forEach((el) => el?.setAttribute(OK_ATTR, ""));

      const target = next.done ? document.querySelector(`[data-guide-flow='${flow.n + 1}']`) : next.target;
      if (target !== lastTarget.current) {
        lastTarget.current = target ?? null;
        lastTouch.current = Date.now();
      }
      if (!target || Date.now() - lastTouch.current < IDLE_MS) return setBubble(null);
      const r = target.getBoundingClientRect();
      const size = Math.max(36, Math.min(56, Math.min(r.width, r.height) + 8));
      setBubble({ x: r.left + r.width / 2, y: r.top + r.height / 2, size, hint: next.done ? undefined : next.hint });
    };
    tick();
    const t = setInterval(tick, TICK_MS);
    return () => {
      clearInterval(t);
      document.querySelectorAll(`[${OK_ATTR}]`).forEach((el) => el.removeAttribute(OK_ATTR));
    };
  }, [flow, path, params]);

  // Any tap or key press hides the bubble and restarts the wait. Nothing is blocked: the tap goes
  // through to the app as usual.
  useEffect(() => {
    if (!flow) return;
    const touched = () => {
      lastTouch.current = Date.now();
      setBubble(null);
    };
    document.addEventListener("pointerdown", touched, { capture: true, passive: true });
    document.addEventListener("keydown", touched, true);
    return () => {
      document.removeEventListener("pointerdown", touched, true);
      document.removeEventListener("keydown", touched, true);
    };
  }, [flow]);

  if (!bubble || !flow) return null;
  return createPortal(
    // Two separate fixed layers, not one group: the bubble has to blend with the page itself.
    <div aria-hidden>
      <span className="guide-bubble" style={{ left: bubble.x, top: bubble.y, width: bubble.size, height: bubble.size }}>
        <span className="guide-bubble-ring" />
      </span>
      {bubble.hint && <span className="guide-bubble-hint" style={{ left: bubble.x, top: bubble.y + bubble.size / 2 + 8 }}>{bubble.hint}</span>}
    </div>,
    document.body,
  );
}
