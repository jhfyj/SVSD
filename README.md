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

## Maps

The radio screen's map is OpenStreetMap, drawn by [MapLibre](https://maplibre.org/) in the app's own style: black and white, street names in Geist Mono, no place names or points of interest, 3D buildings, tilted to follow you along your route with the next turn shown at the top. Everything runs without a key:

- **Tiles**: [OpenFreeMap](https://openfreemap.org/) (`TILES` in `src/lib/nav/mapStyle.ts`). The look is the style in that file.
- **Routes** (with turn-by-turn steps): OSRM at `routing.openstreetmap.de`. **Address search**: [Photon](https://photon.komoot.io/). Both in `src/lib/journey/geo.ts`.
- **Street-name font**: glyphs built from Geist Mono into `public/map/fonts` by `scripts/map-glyphs.py` (instructions at the top of the file).

These are free public servers with fair-use limits: fine for the prototype and demos. Before launch, point them at a keyed provider with the same APIs (MapTiler, Geoapify or Stadia for tiles; Geoapify or Stadia for routes and search), or host them.

The map credits OpenStreetMap with a small (i) in its corner. The data's licence requires a credit, so keep it.

MapLibre's tile worker is copied from `node_modules` into `public/map/maplibre` before `dev`, `build` and Storybook (`scripts/copy-map-worker.mjs`).

To try it: set a destination on `/journey`, press **Start journey**, and the radio navigates there from where you are. To watch the drive without moving, open `/radio?sim` (2x speed) or `/radio?sim=5`. The demo drive also starts on its own if location is off.

## Design

Tokens (colors, radius, fonts) live in `src/app/globals.css`. Brands, skills, fonts and component libraries are pulled from [design-to-code](https://github.com/jhfyj/design-to-code); see `AGENTS.md` for how.
