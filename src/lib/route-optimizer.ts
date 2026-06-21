export type Stop = { id: string; lat: number; lng: number; address: string };

export type OptimizedRoute = {
  stops: Stop[];
  totalDistanceKm: number;
  estimatedMinutes: number;
};

const AVG_SPEED_KMH = 30;

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function optimizeRoute(
  origin: { lat: number; lng: number },
  stops: Stop[],
): OptimizedRoute {
  if (stops.length === 0) {
    return { stops: [], totalDistanceKm: 0, estimatedMinutes: 0 };
  }

  const remaining = [...stops];
  const ordered: Stop[] = [];
  let current = { lat: origin.lat, lng: origin.lng };
  let totalKm = 0;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineDistance(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    totalKm += bestDist;
    current = { lat: next.lat, lng: next.lng };
  }

  const estimatedMinutes = Math.round((totalKm / AVG_SPEED_KMH) * 60);
  return { stops: ordered, totalDistanceKm: totalKm, estimatedMinutes };
}

export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}min`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}min`;
}
