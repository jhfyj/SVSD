# SVSD

Hackathon project built with [Next.js](https://nextjs.org) (App Router), React, TypeScript and Tailwind CSS v4.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. Edit `src/app/page.tsx` to start.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Google Maps

The radio screen's map is a Google vector map that follows you along your route, tilted into a 3D view, with the next turn shown at the top. Address search and routes come from Google too. Without a key the app still runs: search and routes fall back to OpenStreetMap (Photon, OSRM) and the radio shows the placeholder map.

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and attach a billing account. The monthly free usage covers a hackathon.
2. Under **APIs & Services → Library**, enable **Maps JavaScript API**, **Places API (New)** and **Routes API**.
3. Under **APIs & Services → Credentials**, create an API key. Under **API restrictions**, allow only those three APIs.
4. `cp .env.example .env.local`, then set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to the key. Restart `npm run dev`.
5. Optional: for the black-and-white style, go to **Google Maps Platform → Map Styles**, create a style (start from a dark/monochrome one, turn saturation down, hide points of interest and transit). Then go to **Map Management**, create a **JavaScript · Vector** Map ID, link the style, and set `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`. Until then the map uses `DEMO_MAP_ID` with a greyscale filter (`.nav-map` in `globals.css`).

To try it: set a destination on `/journey`, press **Start journey**, and the radio navigates there from where you are. To watch the drive without moving, open `/radio?sim` (2x speed) or `/radio?sim=5`. The demo drive also starts on its own if location is off.

Before deploying, give the key **Website restrictions** for your domain (and `localhost:3000` for development). Search and routes are called from the server, so with a website-restricted key either keep using the one key (the server passes your site's Referer along) or make a second, unrestricted-by-website key for the server: set it as `GOOGLE_MAPS_SERVER_KEY`, limited to Places API (New) and Routes API.

## Design

Tokens (colors, radius, fonts) live in `src/app/globals.css`. Brands, skills, fonts and component libraries are pulled from [design-to-code](https://github.com/jhfyj/design-to-code); see `AGENTS.md` for how.
