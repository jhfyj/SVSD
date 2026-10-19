/*
  Day and night themes, switched by the clock like Google Maps.
  Light between sunrise and sunset where you are; without a known place, light from 7am to 7pm.
  `?theme=light`, `?theme=dark` or `?theme=auto` pins or unpins a theme for demos (kept in localStorage).
*/

export type Theme = "light" | "dark";
export type ThemeChoice = Theme | "auto";

export const THEME_KEY = "svsd-theme";
export const PLACE_KEY = "svsd-place";

/**
 * The theme for this moment. Self-contained (no imports, no outer variables) because it is also
 * inlined as a script in <head>, so the first paint is already in the right theme.
 * That's why THEME_KEY and PLACE_KEY are spelled out here.
 */
export function pickTheme(now: Date = new Date()): Theme {
  const read = (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const pinned = read("svsd-theme");
  if (pinned === "light" || pinned === "dark") return pinned;

  let place: { lat: number; lng: number } | null = null;
  try {
    place = JSON.parse(read("svsd-place") || "null");
  } catch {}

  if (place && typeof place.lat === "number" && typeof place.lng === "number") {
    // NOAA's sunrise equation, good to a minute or two.
    const rad = Math.PI / 180;
    const day = (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 864e5;
    const g = ((2 * Math.PI) / 365) * (day - 1);
    const eqTime =
      229.18 *
      (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl =
      0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) +
      0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const lat = place.lat * rad;
    const cosH = (Math.cos(90.833 * rad) - Math.sin(lat) * Math.sin(decl)) / (Math.cos(lat) * Math.cos(decl));
    if (cosH > 1) return "dark"; // polar night
    if (cosH < -1) return "light"; // midnight sun
    const h = Math.acos(cosH) / rad;
    const rise = 720 - 4 * (place.lng + h) - eqTime; // minutes after UTC midnight
    const set = 720 - 4 * (place.lng - h) - eqTime;
    const mod = (m: number) => ((m % 1440) + 1440) % 1440;
    const minute = now.getUTCHours() * 60 + now.getUTCMinutes();
    return mod(minute - rise) < mod(set - rise) ? "light" : "dark";
  }

  const hour = now.getHours();
  return hour >= 7 && hour < 19 ? "light" : "dark";
}

/*
  Night mode's amber radio (DESIGN.md §3.8) is a switch, OFF by default for now (Jen, Oct 18 2026):
  at night the radio keeps the normal dark theme. Turned on, `data-amber="on"` on <html> lets the
  .radio-night tokens in globals.css take over. `?amber=on` / `?amber=off` sets it for demos (kept in
  localStorage); the Dial Kit has the same switch. Night mode's moments (sunset, check-in, rest
  area) play either way.
*/
export const AMBER_KEY = "svsd-night-amber";

/** Pins or unpins a theme from `?theme=`, then applies the theme for now to <html>. */
export function applyTheme() {
  try {
    const params = new URLSearchParams(location.search);
    const choice = params.get("theme");
    if (choice === "light" || choice === "dark") localStorage.setItem(THEME_KEY, choice);
    if (choice === "auto") localStorage.removeItem(THEME_KEY);
    const amber = params.get("amber");
    if (amber === "on" || amber === "off") localStorage.setItem(AMBER_KEY, amber);
  } catch {}
  document.documentElement.dataset.theme = pickTheme();
  document.documentElement.dataset.amber = amberOn() ? "on" : "off";
}

/** applyTheme as an inline <head> script, so the first paint is already in the right theme. */
export const themeScript = `(function(){var a="off";try{var p=new URLSearchParams(location.search),c=p.get("theme");if(c==="light"||c==="dark")localStorage.setItem("${THEME_KEY}",c);if(c==="auto")localStorage.removeItem("${THEME_KEY}");var m=p.get("amber");if(m==="on"||m==="off")localStorage.setItem("${AMBER_KEY}",m);if(localStorage.getItem("${AMBER_KEY}")==="on")a="on"}catch(e){}document.documentElement.dataset.amber=a;document.documentElement.dataset.theme=(${pickTheme.toString()})()})()`;

/** Whether Night mode's amber radio is switched on. Off unless someone turned it on. */
export function amberOn(): boolean {
  try {
    return localStorage.getItem(AMBER_KEY) === "on";
  } catch {
    return false;
  }
}

/** Switches the amber radio on or off and applies it now, like `?amber=` does. */
export function setAmber(on: boolean) {
  try {
    localStorage.setItem(AMBER_KEY, on ? "on" : "off");
  } catch {}
  document.documentElement.dataset.amber = on ? "on" : "off";
}

/** Remembers roughly where you are (about 10 km) so the theme can follow your sunrise and sunset. */
export function rememberPlace(lat: number, lng: number) {
  try {
    localStorage.setItem(PLACE_KEY, JSON.stringify({ lat: Math.round(lat * 10) / 10, lng: Math.round(lng * 10) / 10 }));
  } catch {}
}

/** The pinned theme, or "auto" when it follows the clock. */
export function themeChoice(): ThemeChoice {
  try {
    const pinned = localStorage.getItem(THEME_KEY);
    if (pinned === "light" || pinned === "dark") return pinned;
  } catch {}
  return "auto";
}

/** Pins a theme (or goes back to the clock) and applies it now, like `?theme=` does. */
export function setThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === "auto") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {}
  document.documentElement.dataset.theme = pickTheme();
}
