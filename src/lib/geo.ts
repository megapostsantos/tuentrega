export type Ponto = { lat: number; lng: number; t: number };

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function trailKm(points: { lat: number; lng: number }[]): number {
  let km = 0;
  for (let i = 1; i < points.length; i++) {
    const d = haversineKm(points[i - 1], points[i]);
    if (d < 5) km += d; // ignora saltos absurdos de GPS
  }
  return km;
}

export function fmtDur(ms: number): string {
  if (!isFinite(ms) || ms < 0) return "—";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  return `${h}h${String(min % 60).padStart(2, "0")}`;
}

export type EstadoMov = { estado: "movimento" | "parado" | "sem_sinal"; paradoMin: number };

// pontos em ordem do mais recente para o mais antigo
export function estadoMovimento(pontosRecentesPrimeiro: Ponto[], agora = Date.now()): EstadoMov {
  const p = pontosRecentesPrimeiro;
  if (!p.length || agora - p[0].t > 5 * 60000) return { estado: "sem_sinal", paradoMin: 0 };
  let desde = p[0].t;
  for (const x of p) {
    if (haversineKm(p[0], x) > 0.08) break;
    desde = x.t;
  }
  const paradoMin = Math.max(0, (p[0].t - desde) / 60000);
  return { estado: paradoMin >= 3 ? "parado" : "movimento", paradoMin };
}
