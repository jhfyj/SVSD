/*
  Calls to Google's web services (Places API (New) and Routes API) from our route handlers, so the
  browser never needs CORS or a second key. Uses GOOGLE_MAPS_SERVER_KEY when it's set; otherwise the
  browser key, passing the visitor's Referer along so a key restricted to your site still works.
*/

const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY;
const browserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export const googleConfigured = Boolean(serverKey || browserKey);

export async function callGoogle(url: string, fieldMask: string, body: unknown, request: Request) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": (serverKey || browserKey)!,
    "X-Goog-FieldMask": fieldMask,
  };
  const referer = request.headers.get("referer");
  if (!serverKey && referer) headers.Referer = referer;

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message: string = data?.error?.message ?? `Google request failed (${res.status})`;
    return Response.json({ error: message }, { status: res.status });
  }
  return Response.json(data);
}

export const notConfigured = () =>
  Response.json({ error: "Google Maps isn't set up (no API key)" }, { status: 501 });
