import { callGoogle, googleConfigured, notConfigured } from "@/lib/google/server";

type Point = { lat: number; lng: number };
const waypoint = ({ lat, lng }: Point) => ({ location: { latLng: { latitude: lat, longitude: lng } } });

/** The driving route with turn-by-turn steps: Routes API computeRoutes, traffic aware. */
export async function POST(request: Request) {
  if (!googleConfigured) return notConfigured();
  const { from, to } = (await request.json()) as { from: Point; to: Point };
  return callGoogle(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    [
      "routes.duration",
      "routes.distanceMeters",
      "routes.polyline.geoJsonLinestring",
      "routes.legs.steps.distanceMeters",
      "routes.legs.steps.navigationInstruction",
    ].join(","),
    {
      origin: waypoint(from),
      destination: waypoint(to),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      polylineQuality: "HIGH_QUALITY",
      polylineEncoding: "GEO_JSON_LINESTRING",
      languageCode: "en-US",
      units: "METRIC",
    },
    request,
  );
}
