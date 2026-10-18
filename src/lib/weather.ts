/*
  The weather where you are, for the top bar. Uses Open-Meteo (no key) with the rough place the
  theme already remembers (svsd-place). Without a place it falls back to clear sky, so the icon
  still shows the time of day (sun or moon).
*/

import { PLACE_KEY, pickTheme } from "./theme";

export type Sky = "clear" | "partly" | "cloudy" | "fog" | "rain" | "snow" | "storm";
export type Weather = { sky: Sky; night: boolean };

const CACHE_KEY = "svsd-weather";
const FRESH_MS = 15 * 60 * 1000;

/** WMO weather code (what Open-Meteo returns) to one of our icons. */
export function skyFromCode(code: number): Sky {
  if (code <= 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "rain"; // drizzle, rain, freezing rain, showers
}

type Place = { lat: number; lng: number };

function readPlace(): Place | null {
  try {
    const place = JSON.parse(localStorage.getItem(PLACE_KEY) || "null");
    return place && typeof place.lat === "number" && typeof place.lng === "number" ? place : null;
  } catch {
    return null;
  }
}

async function fetchSky(place: Place): Promise<Sky> {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && cached.lat === place.lat && cached.lng === place.lng && Date.now() - cached.at < FRESH_MS) {
      return cached.sky;
    }
  } catch {}
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lng}&current=weather_code`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const sky = skyFromCode((await res.json()).current.weather_code);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...place, sky, at: Date.now() }));
  } catch {}
  return sky;
}

/** The weather for now. Night follows the same clock as the dark theme. */
export async function currentWeather(): Promise<Weather> {
  const night = pickTheme() === "dark";
  const place = readPlace();
  if (!place) return { sky: "clear", night };
  try {
    return { sky: await fetchSky(place), night };
  } catch {
    return { sky: "clear", night };
  }
}
