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

/** Pins or unpins a theme from `?theme=`, then applies the theme for now to <html>. */
export function applyTheme() {
  try {
    const choice = new URLSearchParams(location.search).get("theme");
    if (choice === "light" || choice === "dark") localStorage.setItem(THEME_KEY, choice);
    if (choice === "auto") localStorage.removeItem(THEME_KEY);
  } catch {}
  document.documentElement.dataset.theme = pickTheme();
}

/** applyTheme as an inline <head> script, so the first paint is already in the right theme. */
export const themeScript = `(function(){try{var c=new URLSearchParams(location.search).get("theme");if(c==="light"||c==="dark")localStorage.setItem("${THEME_KEY}",c);if(c==="auto")localStorage.removeItem("${THEME_KEY}")}catch(e){}document.documentElement.dataset.theme=(${pickTheme.toString()})()})()`;

/** Remembers roughly where you are (about 10 km) so the theme can follow your sunrise and sunset. */
export function rememberPlace(lat: number, lng: number) {
  try {
    localStorage.setItem(PLACE_KEY, JSON.stringify({ lat: Math.round(lat * 10) / 10, lng: Math.round(lng * 10) / 10 }));
  } catch {}
}
