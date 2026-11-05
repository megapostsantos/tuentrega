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

const dist = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => haversineDistance(a.lat, a.lng, b.lat, b.lng);

/** Caminho aberto (sem voltar): vizinho mais próximo + 2-opt. Bom para dezenas a poucas centenas de paradas. */
export function ordenarParadas<T extends { lat: number; lng: number }>(origem: { lat: number; lng: number }, paradas: T[]): { ordem: T[]; km: number } {
  const n = paradas.length;
  if (n === 0) return { ordem: [], km: 0 };
  const restantes = paradas.map((_, i) => i);
  const rota: number[] = [];
  let atual: { lat: number; lng: number } = origem;
  while (restantes.length) {
    let melhor = 0, md = Infinity;
    for (let k = 0; k < restantes.length; k++) { const d = dist(atual, paradas[restantes[k]]); if (d < md) { md = d; melhor = k; } }
    const i = restantes.splice(melhor, 1)[0];
    rota.push(i); atual = paradas[i];
  }
  const pt = (i: number) => (i < 0 ? origem : paradas[rota[i]]);
  let melhorou = true, voltas = 0;
  while (melhorou && voltas++ < 60) {
    melhorou = false;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const antes = dist(pt(i - 1), pt(i)) + (j + 1 < n ? dist(pt(j), pt(j + 1)) : 0);
        const depois = dist(pt(i - 1), pt(j)) + (j + 1 < n ? dist(pt(i), pt(j + 1)) : 0);
        if (depois + 1e-9 < antes) { rota.splice(i, j - i + 1, ...rota.slice(i, j + 1).reverse()); melhorou = true; }
      }
    }
  }
  let km = 0, prev = origem;
  for (const i of rota) { km += dist(prev, paradas[i]); prev = paradas[i]; }
  return { ordem: rota.map((i) => paradas[i]), km };
}

/** Tempo estimado: deslocamento urbano (25 km/h) + minutos parado em cada entrega. */
export function estimarMinutos(km: number, paradas: number, minPorParada = 3): number {
  return Math.round((km / 25) * 60 + paradas * minPorParada);
}
