import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin, Bike } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Pacote = {
  id: string;
  numero_pacote: number;
  ordem_otimizada: number | null;
  lat: number | null;
  lng: number | null;
  status: string;
  endereco_entrega: string | null;
};

type Localizacao = {
  lat: number;
  lng: number;
  registrado_em: string;
  velocidade_kmh: number | null;
};

type Entregador = {
  nome_completo: string | null;
  tipo_veiculo: string | null;
};

function pulseIcon() {
  const html = `
    <div style="position:relative;width:24px;height:24px;">
      <span style="position:absolute;inset:0;border-radius:50%;background:#3b82f6;opacity:.45;animation:liveTrackPulse 1.4s ease-out infinite;"></span>
      <span style="position:absolute;inset:6px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></span>
    </div>
    <style>@keyframes liveTrackPulse{0%{transform:scale(.6);opacity:.7}100%{transform:scale(2.2);opacity:0}}</style>`;
  return L.divIcon({ html, className: "live-tracker-marker", iconSize: [24, 24], iconAnchor: [12, 12] });
}

function stopIcon(n: number, done: boolean) {
  const color = done ? "#16a34a" : "#ea580c";
  const html = `<div style="background:${color};color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.4);border:2px solid #fff;">${done ? "✓" : n}</div>`;
  return L.divIcon({ html, className: "live-tracker-stop", iconSize: [26, 26], iconAnchor: [13, 13] });
}

function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (!center) return;
    if (first.current) {
      map.setView(center, 14);
      first.current = false;
    } else {
      map.panTo(center, { animate: true });
    }
  }, [center, map]);
  return null;
}

function timeAgo(date: Date | null): string {
  if (!date) return "—";
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 5) return "agora mesmo";
  if (s < 60) return `há ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  return `há ${h}h`;
}

const VEHICLE_LABEL: Record<string, string> = {
  bicicleta: "Bicicleta", moto: "Moto", carro: "Carro", caminhao: "Caminhão", a_pe: "A pé",
};

type Props = {
  open: boolean;
  onClose: () => void;
  ofertaId: string;
  entregadorId: string | null;
  operacaoId?: string | null;
};

const BRAZIL_CENTER: [number, number] = [-15.7801, -47.9292];

export function LiveTrackingMap({ open, onClose, ofertaId, entregadorId, operacaoId }: Props) {
  const [loc, setLoc] = useState<Localizacao | null>(null);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [entregador, setEntregador] = useState<Entregador | null>(null);
  const [loading, setLoading] = useState(true);
  const [, force] = useState(0);

  // tick to refresh "há Xs"
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);

    (async () => {
      const [{ data: ent }, { data: pks }, { data: locs }] = await Promise.all([
        supabase.from("entregadores").select("nome_completo, tipo_veiculo").eq("id", entregadorId).maybeSingle(),
        supabase.from("entregas_pacotes")
          .select("id, numero_pacote, ordem_otimizada, lat, lng, status, endereco_entrega")
          .eq("oferta_id", ofertaId),
        supabase.from("entregador_localizacao")
          .select("lat, lng, registrado_em, velocidade_kmh")
          .eq("entregador_id", entregadorId)
          .order("registrado_em", { ascending: false })
          .limit(1),
      ]);
      if (!alive) return;
      setEntregador((ent as Entregador) ?? null);
      setPacotes((pks as Pacote[]) ?? []);
      setLoc((locs?.[0] as Localizacao) ?? null);
      setLoading(false);
    })();

    const locChan = supabase
      .channel(`live-tracking-${entregadorId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "entregador_localizacao", filter: `entregador_id=eq.${entregadorId}` },
        (payload) => {
          const r = payload.new as any;
          setLoc({
            lat: Number(r.lat),
            lng: Number(r.lng),
            registrado_em: r.registrado_em,
            velocidade_kmh: r.velocidade_kmh != null ? Number(r.velocidade_kmh) : null,
          });
        },
      )
      .subscribe();

    const pkgChan = supabase
      .channel(`live-tracking-pkg-${ofertaId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "entregas_pacotes", filter: `oferta_id=eq.${ofertaId}` },
        (payload) => {
          const r = payload.new as Pacote;
          setPacotes((prev) => prev.map((p) => (p.id === r.id ? { ...p, ...r } : p)));
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(locChan);
      supabase.removeChannel(pkgChan);
    };
  }, [open, ofertaId, entregadorId]);

  const validPacotes = useMemo(
    () => pacotes
      .filter((p) => Number.isFinite(p.lat as number) && Number.isFinite(p.lng as number))
      .sort((a, b) => (a.ordem_otimizada ?? a.numero_pacote) - (b.ordem_otimizada ?? b.numero_pacote)),
    [pacotes],
  );
  const stats = useMemo(() => {
    const total = pacotes.length;
    const done = pacotes.filter((p) => p.status === "delivered" || p.status === "not_delivered").length;
    return { total, done };
  }, [pacotes]);

  const center: [number, number] | null = loc
    ? [loc.lat, loc.lng]
    : validPacotes[0]
      ? [validPacotes[0].lat as number, validPacotes[0].lng as number]
      : null;

  const lastUpdate = loc ? new Date(loc.registrado_em) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden sm:max-h-[90vh]">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            Rastreamento ao vivo
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-0 sm:grid-cols-[1fr_280px]">
          {/* Map */}
          <div className="h-[60vh] sm:h-[70vh] bg-muted">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : center ? (
              <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {loc && (
                  <Marker position={[loc.lat, loc.lng]} icon={pulseIcon()}>
                    <Tooltip direction="top" offset={[0, -12]}>Entregador</Tooltip>
                  </Marker>
                )}
                {validPacotes.map((p, i) => {
                  const done = p.status === "delivered" || p.status === "not_delivered";
                  return (
                    <Marker key={p.id} position={[p.lat as number, p.lng as number]} icon={stopIcon(i + 1, done)}>
                      <Tooltip direction="top" offset={[0, -14]}>
                        <strong>#{i + 1}</strong> — {p.endereco_entrega ?? "Sem endereço"}
                      </Tooltip>
                    </Marker>
                  );
                })}
                <Recenter center={loc ? [loc.lat, loc.lng] : null} />
              </MapContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <MapPin className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Localização não disponível ainda</p>
                <p className="text-xs text-muted-foreground">O entregador ainda não começou a compartilhar a posição.</p>
              </div>
            )}
          </div>

          {/* Side panel */}
          <div className="border-t sm:border-t-0 sm:border-l p-4 space-y-4 overflow-y-auto">
            <div>
              <p className="text-xs text-muted-foreground">Entregador</p>
              <p className="font-semibold leading-tight">{entregador?.nome_completo ?? "—"}</p>
              {entregador?.tipo_veiculo && (
                <Badge variant="secondary" className="mt-1 gap-1">
                  <Bike className="h-3 w-3" />
                  {VEHICLE_LABEL[entregador.tipo_veiculo] ?? entregador.tipo_veiculo}
                </Badge>
              )}
            </div>

            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Progresso</p>
              <p className="text-2xl font-bold tabular-nums">
                {stats.done}<span className="text-base text-muted-foreground"> / {stats.total}</span>
              </p>
              <p className="text-xs text-muted-foreground">paradas concluídas</p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Última atualização</p>
              <p className="text-sm font-medium">{loc ? timeAgo(lastUpdate) : "Aguardando GPS"}</p>
              {loc?.velocidade_kmh != null && (
                <p className="text-xs text-muted-foreground mt-1">{loc.velocidade_kmh.toFixed(0)} km/h</p>
              )}
            </div>

            {!loc && !loading && (
              <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                O entregador ainda não está compartilhando a localização.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LiveTrackingMap;
