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

async function reverseGeocode(lat: number, lon: number): Promise<DetectedCity | null> {
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
  );
  if (!res.ok) return null;
  const j = (await res.json()) as { city?: string; locality?: string; principalSubdivision?: string };
  const city = j.city || j.locality || "";
  if (!city) return null;
  return { city, nearest: nearestBrand(city, j.principalSubdivision ?? ""), source: "gps" };
}

async function ipLookup(): Promise<DetectedCity | null> {
  try {
    const res = await fetch("https://ipapi.co/json/");
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

  const coords = await new Promise<GeolocationPosition | null>((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: false, timeout, maximumAge: 10 * 60 * 1000 },
    );
  });

  if (coords) {
    try {
      const via = await reverseGeocode(coords.coords.latitude, coords.coords.longitude);
      if (via) return via;
    } catch {
      /* fall through to IP */
    }
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