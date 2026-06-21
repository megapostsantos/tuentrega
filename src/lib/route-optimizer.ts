// Route optimization using the Nearest Neighbor heuristic.
// Good enough for up to ~200 stops; O(n²) time complexity.

export type Stop = {
  id: string;
  lat: number;
  lng: number;
  address: string;
  /** Preferred delivery window start, "HH:MM" (24h) */
  windowStart?: string;
  /** Preferred delivery window end, "HH:MM" (24h) */
  windowEnd?: string;
};

export type OptimizedRoute = {
  stops: Stop[];
  totalDistanceKm: number;
  estimatedMinutes: number;
};

const AVG_URBAN_KMH = 30;
const SERVICE_MINUTES_PER_STOP = 3; // average time spent per delivery
const WINDOW_PENALTY_KM = 5; // virtual extra "distance" when a stop is out of its window
const DEFAULT_START_MINUTES = 8 * 60; // assume route starts at 08:00

/**
 * Haversine distance in kilometers between two lat/lng points.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseHHMM(value?: string): number | null {
  if (!value) return null;
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  return h * 60 + min;
}

/**
 * Nearest-neighbor route optimization starting from `origin`.
 * Stops with a time window are penalized if the projected arrival time
 * falls outside [windowStart, windowEnd].
 */
export function optimizeRoute(
  origin: { lat: number; lng: number },
  stops: Stop[],
): OptimizedRoute {
  const remaining = [...stops];
  const ordered: Stop[] = [];
  let totalDistanceKm = 0;
  let elapsedMinutes = 0;
  let currentLat = origin.lat;
  let currentLng = origin.lng;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = Infinity;
    let bestDistance = 0;

    for (let i = 0; i < remaining.length; i++) {
      const s = remaining[i];
      const distance = haversineDistance(currentLat, currentLng, s.lat, s.lng);
      const travelMinutes = (distance / AVG_URBAN_KMH) * 60;
      const arrivalMinutes =
        DEFAULT_START_MINUTES + elapsedMinutes + travelMinutes;

      let score = distance;
      const ws = parseHHMM(s.windowStart);
      const we = parseHHMM(s.windowEnd);
      if (ws !== null && arrivalMinutes < ws) score += WINDOW_PENALTY_KM;
      if (we !== null && arrivalMinutes > we) score += WINDOW_PENALTY_KM;

      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
        bestDistance = distance;
      }
    }

    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    totalDistanceKm += bestDistance;
    elapsedMinutes +=
      (bestDistance / AVG_URBAN_KMH) * 60 + SERVICE_MINUTES_PER_STOP;
    currentLat = next.lat;
    currentLng = next.lng;
  }

  return {
    stops: ordered,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    estimatedMinutes: Math.round(elapsedMinutes),
  };
}

/**
 * Format minutes as a human-readable duration. e.g. 83 -> "1h 23min"
 */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
