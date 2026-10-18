import { callGoogle, googleConfigured, notConfigured } from "@/lib/google/server";

/** Address search: Places API (New) Text Search, biased toward where you are. */
export async function POST(request: Request) {
  if (!googleConfigured) return notConfigured();
  const { query, near } = (await request.json()) as { query: string; near?: { lat: number; lng: number } | null };
  return callGoogle(
    "https://places.googleapis.com/v1/places:searchText",
    "places.id,places.displayName,places.formattedAddress,places.location",
    {
      textQuery: query,
      pageSize: 6,
      languageCode: "en",
      ...(near && {
        locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 50000 } },
      }),
    },
    request,
  );
}
