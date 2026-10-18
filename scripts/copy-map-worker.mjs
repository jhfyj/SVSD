/*
  MapLibre (v6) draws tiles in a module worker that imports a shared chunk beside it. The bundler
  can't see the worker's URL, so both files are copied into public/ before dev and build, and the
  map points at them (setWorkerUrl in NavMap). Copied fresh each time, so they match the installed
  version; not committed (see .gitignore).
*/
import { copyFileSync, mkdirSync } from "node:fs";

const from = "node_modules/maplibre-gl/dist";
const to = "public/map/maplibre";
mkdirSync(to, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(`${from}/${file}`, `${to}/${file}`);
