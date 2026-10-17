import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type FleetMarker = { id: string; lat: number; lng: number; nome: string; estado: "movimento" | "parado" | "sem_sinal"; trilha?: [number, number][] };

const COR = { movimento: "#16a34a", parado: "#f59e0b", sem_sinal: "#9ca3af" } as const;

function icone(estado: FleetMarker["estado"], nome: string) {
  const ini = nome.trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  return L.divIcon({
    html: `<div style="background:${COR[estado]};color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)">${ini}</div>`,
    className: "fleet-marker",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function Ajustar({ marcadores }: { marcadores: FleetMarker[] }) {
  const map = useMap();
  const chave = marcadores.map((m) => m.id).join(",");
  useEffect(() => {
    if (!marcadores.length) return;
    const b = L.latLngBounds(marcadores.map((m) => [m.lat, m.lng] as [number, number]));
    map.fitBounds(b, { padding: [40, 40], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, map]);
  return null;
}

export function FleetMap({ marcadores }: { marcadores: FleetMarker[] }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return <div className="h-72 rounded-lg bg-muted" />;
  return (
    <div className="h-72 overflow-hidden rounded-lg border sm:h-96">
      <MapContainer center={[-23.55, -46.63]} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {marcadores.map((m) => m.trilha && m.trilha.length > 1 ? (
          <Polyline key={`t-${m.id}`} positions={m.trilha} pathOptions={{ color: COR[m.estado], weight: 3, opacity: 0.6 }} />
        ) : null)}
        {marcadores.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={icone(m.estado, m.nome)}>
            <Tooltip direction="top" offset={[0, -14]}>{m.nome}</Tooltip>
          </Marker>
        ))}
        <Ajustar marcadores={marcadores} />
      </MapContainer>
    </div>
  );
}
