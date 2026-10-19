import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from "maplibre-gl";

/*
  The radio map's look, as a MapLibre style over OpenStreetMap vector tiles (OpenFreeMap, no key).
  Black and white and quiet: land, water, roads by size, 3D buildings, and street names in Geist
  Mono. No place names, shops or points of interest. On screen the canvas also gets the radio's
  LCD tint (.nav-map in globals.css), a slight green cast at night.
  Tiles: swap TILES for a keyed provider with the same OpenMapTiles schema (MapTiler, Geoapify,
  Stadia) when the free public server isn't enough.
*/

export const TILES = "https://tiles.openfreemap.org/planet";
/** Glyphs made by scripts/map-glyphs.py from the app's own font. */
const GLYPHS = "/map/fonts/{fontstack}/{range}.pbf";
const FONT = ["Geist Mono Regular"];

type Palette = {
  land: string;
  park: string;
  water: string;
  building: string;
  minor: string;
  street: string;
  major: string;
  highway: string;
  label: string;
  halo: string;
  /** The route ahead: a dark casing under a bright line (nothing is drawn behind you). */
  casing: string;
  route: string;
};

const NIGHT: Palette = {
  land: "#121212",
  park: "#161616",
  water: "#050505",
  building: "#202020",
  minor: "#262626",
  street: "#323232",
  major: "#444444",
  highway: "#555555",
  label: "#8f8f8f",
  halo: "#121212",
  casing: "#000000",
  route: "#ffffff",
};

const DAY: Palette = {
  land: "#e9e8e4",
  park: "#e1e0dc",
  water: "#c9cacb",
  building: "#d6d5d1",
  minor: "#f7f7f5",
  street: "#ffffff",
  major: "#ffffff",
  highway: "#ffffff",
  label: "#6f6f6c",
  halo: "#e9e8e4",
  casing: "#1d1c1a",
  route: "#1d1c1a",
};

/** Road widths in px by zoom, so roads thicken as you close in. */
const width = (z12: number, z18: number): ExpressionSpecification => [
  "interpolate",
  ["exponential", 1.6],
  ["zoom"],
  12,
  z12,
  18,
  z18,
];

const roads = (p: Palette): LayerSpecification[] => {
  const road = (id: string, classes: string[], color: string, w: ExpressionSpecification): LayerSpecification => ({
    id,
    type: "line",
    source: "osm",
    "source-layer": "transportation",
    filter: ["all", ["in", ["get", "class"], ["literal", classes]], ["!=", ["get", "brunnel"], "tunnel"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": color, "line-width": w },
  });
  return [
    road("road-minor", ["minor", "service", "track"], p.minor, width(0.5, 9)),
    road("road-street", ["tertiary", "secondary"], p.street, width(1, 14)),
    road("road-major", ["primary", "trunk"], p.major, width(1.4, 18)),
    road("road-highway", ["motorway"], p.highway, width(1.6, 22)),
  ];
};

/**
 * Day to night (and back), the map never reloads: its colours slide from one palette to the other
 * over this long, in place. Matches DUSK_MS (lib/radio/nightDrive), so at sunset the map darkens
 * as the sun sinks, and the LCD tint's CSS transition (.nav-map in globals.css).
 */
export const MAP_FADE_MS = 2400;

export const palette = (theme: "dark" | "light"): Palette => (theme === "light" ? DAY : NIGHT);

/** Every colour the palette paints: [layer, paint property, palette key]. Keep in step with mapStyle. */
export const PAINTED: [string, string, keyof Palette][] = [
  ["land", "background-color", "land"],
  ["park", "fill-color", "park"],
  ["water", "fill-color", "water"],
  ["road-minor", "line-color", "minor"],
  ["road-street", "line-color", "street"],
  ["road-major", "line-color", "major"],
  ["road-highway", "line-color", "highway"],
  ["buildings", "fill-extrusion-color", "building"],
  ["route-casing", "line-color", "casing"],
  ["route-ahead", "line-color", "route"],
  ["street-names", "text-color", "label"],
  ["street-names", "text-halo-color", "halo"],
];

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (c: number[]) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/** A palette `k` of the way from `a` to `b` (0 = a, 1 = b). */
export function mixPalette(a: Palette, b: Palette, k: number): Palette {
  const out = { ...a };
  for (const key of Object.keys(a) as (keyof Palette)[]) {
    const [x, y] = [rgb(a[key]), rgb(b[key])];
    out[key] = hex(x.map((v, i) => v + (y[i] - v) * k));
  }
  return out;
}

export type { Palette };

export function mapStyle(theme: "dark" | "light"): StyleSpecification {
  const p = palette(theme);
  return {
    version: 8,
    // Absolute, since the map's workers fetch it. Client only, like the map.
    glyphs: location.origin + GLYPHS,
    sources: {
      osm: { type: "vector", url: TILES },
      route: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
    },
    layers: [
      { id: "land", type: "background", paint: { "background-color": p.land } },
      {
        id: "park",
        type: "fill",
        source: "osm",
        "source-layer": "park",
        paint: { "fill-color": p.park },
      },
      {
        id: "water",
        type: "fill",
        source: "osm",
        "source-layer": "water",
        paint: { "fill-color": p.water },
      },
      ...roads(p),
      {
        id: "buildings",
        type: "fill-extrusion",
        source: "osm",
        "source-layer": "building",
        minzoom: 14,
        filter: ["!=", ["get", "hide_3d"], true],
        paint: {
          "fill-extrusion-color": p.building,
          // Kept low (60% of real height), so a downtown block reads as a block, not a wall over the road.
          "fill-extrusion-height": ["*", 0.6, ["coalesce", ["get", "render_height"], 6]],
          "fill-extrusion-base": ["*", 0.6, ["coalesce", ["get", "render_min_height"], 0]],
          // Rise up as you zoom in, so they don't pop.
          "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0, 15.5, 0.7],
        },
      },
      // The route sits above the buildings, so a tall block never hides the way ahead.
      {
        id: "route-casing",
        type: "line",
        source: "route",
        filter: ["==", ["get", "part"], "ahead"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": p.casing, "line-opacity": 0.8, "line-width": 11 },
      },
      {
        id: "route-ahead",
        type: "line",
        source: "route",
        filter: ["==", ["get", "part"], "ahead"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": p.route, "line-width": 7 },
      },
      {
        id: "street-names",
        type: "symbol",
        source: "osm",
        "source-layer": "transportation_name",
        minzoom: 13,
        layout: {
          "symbol-placement": "line",
          "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
          "text-font": FONT,
          "text-size": ["interpolate", ["linear"], ["zoom"], 13, 9, 18, 12],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.08,
          "text-max-angle": 30,
          // Upright to the viewer, so names far down the tilted road stay readable.
          "text-pitch-alignment": "viewport",
        },
        paint: { "text-color": p.label, "text-halo-color": p.halo, "text-halo-width": 1.5 },
      },
    ],
  };
}
