// Automatic city detection.
// 1. Browser geolocation (shows the native permission popup) + free reverse geocode.
// 2. IP-based lookup as a silent fallback when permission is denied/unavailable.
// Callers must always keep a manual city picker as the final fallback.

export type DetectedCity = { city: string; nearest: "Indore" | "Ujjain" | "Other"; source: "gps" | "ip" };

const CITY_KEY = "tf_location";

function nearestBrand(city: string, region = ""): DetectedCity["nearest"] {
  const s = `${city} ${region}`.toLowerCase();
  if (s.includes("indore")) return "Indore";
  if (s.includes("ujjain")) return "Ujjain";
  return "Other";
}

// Our service area. Coordinates are enough to name the city without a paid
// geocoding provider — anything far from both is reported as "Other".
const SERVICE_CITIES = [
  { name: "Indore", lat: 22.7196, lon: 75.8577 },
  { name: "Ujjain", lat: 23.1765, lon: 75.7885 },
] as const;

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fromCoords(lat: number, lon: number): DetectedCity {
  const ranked = SERVICE_CITIES.map((c) => ({ c, d: distanceKm(lat, lon, c.lat, c.lon) })).sort(
    (a, b) => a.d - b.d,
  );
  const best = ranked[0]!;
  if (best.d <= 60) return { city: best.c.name, nearest: best.c.name, source: "gps" };
  return { city: "Other", nearest: "Other", source: "gps" };
}

async function ipLookup(): Promise<DetectedCity | null> {
  try {
    // Best-effort only: never let a slow/blocked provider stall the UI.
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { city?: string; region?: string };
    if (!j.city) return null;
    return { city: j.city, nearest: nearestBrand(j.city, j.region ?? ""), source: "ip" };
  } catch {
    return null;
  }
}

/** Ask the browser for precise location; falls back to IP, then null. */
export async function detectCity(opts: { timeoutMs?: number } = {}): Promise<DetectedCity | null> {
  if (typeof window === "undefined") return null;
  const timeout = opts.timeoutMs ?? 8000;
  // Hard ceiling so the UI can always fall back to manual selection.
  const guard = new Promise<null>((r) => setTimeout(() => r(null), timeout + 6000));
  return Promise.race([detectCityInner(timeout), guard]);
}

async function detectCityInner(timeout: number): Promise<DetectedCity | null> {
  const coords = await new Promise<GeolocationPosition | null>((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: false, timeout, maximumAge: 10 * 60 * 1000 },
    );
  });

  if (coords) {
    const via = fromCoords(coords.coords.latitude, coords.coords.longitude);
    // Outside the service area: try to name the actual city for the record.
    if (via.nearest !== "Other") return via;
    const byIp = await ipLookup();
    return byIp ?? via;
  }
  return ipLookup();
}

/** Has the user already granted/denied location without us prompting again? */
export async function geolocationPermission(): Promise<PermissionState | "unsupported"> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unsupported";
  try {
    const s = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return s.state;
  } catch {
    return "unsupported";
  }
}

export function rememberCity(city: string) {
  try {
    window.localStorage.setItem(CITY_KEY, city);
  } catch {
    /* ignore */
  }
}

export function getRememberedCity(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CITY_KEY);
  } catch {
    return null;
  }
}