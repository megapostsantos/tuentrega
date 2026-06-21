// Geocoding utilities backed by the free Nominatim (OpenStreetMap) API.
// Rate-limited to 1 request/second per Nominatim usage policy.

export type LatLng = { lat: number; lng: number };
export type GeocodedAddress = { address: string; lat: number; lng: number };

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const RATE_LIMIT_MS = 1100;

// In-memory cache (per session) to avoid duplicate requests
const cache = new Map<string, LatLng | null>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalizeKey(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Convert a Brazilian address into lat/lng coordinates.
 * Returns null on any failure (network, no results, parse error).
 */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (!address || !address.trim()) return null;

  const key = normalizeKey(address);
  if (cache.has(key)) return cache.get(key)!;

  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=br`;
    const res = await fetch(url, {
      headers: {
        // Nominatim requires a descriptive User-Agent / Referer.
        // Browsers will set Referer automatically; we add Accept-Language for BR results.
        "Accept-Language": "pt-BR",
      },
    });
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(data) || data.length === 0) {
      cache.set(key, null);
      return null;
    }
    const first = data[0];
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      cache.set(key, null);
      return null;
    }
    const result = { lat, lng };
    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  }
}

/**
 * Geocode multiple addresses sequentially, respecting Nominatim's
 * 1 request/second rate limit (uses ~1100ms spacing). Cached entries
 * are returned immediately without consuming the rate limit budget.
 */
export async function geocodeMultiple(
  addresses: string[],
): Promise<Array<GeocodedAddress | null>> {
  const results: Array<GeocodedAddress | null> = [];

  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    const key = normalizeKey(address ?? "");
    const cached = cache.has(key);

    // Only delay before live requests (skip delay for cached hits and the first call)
    if (!cached && i > 0) {
      await sleep(RATE_LIMIT_MS);
    }

    const coords = await geocodeAddress(address);
    results.push(coords ? { address, lat: coords.lat, lng: coords.lng } : null);
  }

  return results;
}

/** Clear the in-memory geocoding cache (mostly useful for tests). */
export function clearGeocodingCache(): void {
  cache.clear();
}
