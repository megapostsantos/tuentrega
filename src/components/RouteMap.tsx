import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type RouteStop = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  status?: string;
};

type Props = {
  stops: RouteStop[];
  origin?: { lat: number; lng: number };
  height?: number | string;
};

function statusColor(status?: string): string {
  switch (status) {
    case "delivered":
    case "entregue":
      return "#16a34a";
    case "failed":
    case "nao_entregue":
      return "#dc2626";
    case "in_progress":
    case "em_rota":
      return "#ea580c";
    default:
      return "#2563eb";
  }
}

function numberedIcon(n: number, color: string) {
  const html = `
    <div style="
      background:${color};
      color:#fff;
      width:28px;height:28px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:600;
      box-shadow:0 1px 4px rgba(0,0,0,.4);
      border:2px solid #fff;
    ">${n}</div>`;
  return L.divIcon({
    html,
    className: "route-map-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function originIcon() {
  const html = `
    <div style="
      background:#0f172a;color:#fff;
      width:28px;height:28px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:700;
      box-shadow:0 1px 4px rgba(0,0,0,.4);
      border:2px solid #fff;
    ">A</div>`;
  return L.divIcon({
    html,
    className: "route-map-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [map, points]);
  return null;
}

export function RouteMap({ stops, origin, height = 360 }: Props) {
  const validStops = stops.filter(
    (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng),
  );

  const polyPoints: [number, number][] = [
    ...(origin ? [[origin.lat, origin.lng] as [number, number]] : []),
    ...validStops.map((s) => [s.lat, s.lng] as [number, number]),
  ];

  const fallbackCenter: [number, number] = origin
    ? [origin.lat, origin.lng]
    : validStops[0]
      ? [validStops[0].lat, validStops[0].lng]
      : [-23.55, -46.63];

  return (
    <div style={{ height, width: "100%" }} className="overflow-hidden rounded-lg border">
      <MapContainer
        center={fallbackCenter}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {polyPoints.length >= 2 && (
          <Polyline positions={polyPoints} pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.75 }} />
        )}

        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={originIcon()}>
            <Tooltip direction="top" offset={[0, -16]}>Origem</Tooltip>
          </Marker>
        )}

        {validStops.map((s, i) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={numberedIcon(i + 1, statusColor(s.status))}>
            <Tooltip direction="top" offset={[0, -16]}>
              <strong>#{i + 1}</strong> — {s.label}
            </Tooltip>
          </Marker>
        ))}

        <FitBounds points={polyPoints} />
      </MapContainer>
    </div>
  );
}

export default RouteMap;
