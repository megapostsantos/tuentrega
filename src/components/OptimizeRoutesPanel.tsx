import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, MapPin, GripVertical, Save, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";
import { geocodeMultiple } from "@/lib/geocoding";
import { optimizeRoute, formatDuration, type Stop } from "@/lib/route-optimizer";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons (vite asset paths)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type RotaInput = { id: string; nome: string; oferta_id: string | null };

type OptimizedStopRow = Stop & { ordem: number; distanciaAnterior?: number };

const ROUTE_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#ea580c", "#9333ea", "#0d9488", "#db2777", "#65a30d"];

export function OptimizeRoutesPanel({
  rotas,
  empresaOrigin,
}: {
  rotas: RotaInput[];
  empresaOrigin?: { lat: number; lng: number } | null;
}) {
  const [openRota, setOpenRota] = useState<RotaInput | null>(null);
  const publishedRotas = rotas.filter((r) => !!r.oferta_id);

  if (publishedRotas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Publique as ofertas para habilitar a otimização de rotas.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-medium">
        <RouteIcon className="h-4 w-4" /> Otimizar Rotas
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {publishedRotas.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded border p-2">
            <span className="text-sm">{r.nome}</span>
            <Button size="sm" variant="outline" onClick={() => setOpenRota(r)}>
              <Wand2 className="mr-2 h-3.5 w-3.5" /> Otimizar
            </Button>
          </div>
        ))}
      </div>
      {openRota && (
        <OptimizeRouteDialog
          rota={openRota}
          origin={empresaOrigin ?? null}
          onClose={() => setOpenRota(null)}
        />
      )}
    </div>
  );
}

function OptimizeRouteDialog({
  rota,
  origin,
  onClose,
}: {
  rota: RotaInput;
  origin: { lat: number; lng: number } | null;
  onClose: () => void;
}) {
  const ofertaId = rota.oferta_id!;
  const [loading, setLoading] = useState(true);
  const [addressesText, setAddressesText] = useState("");
  const [stops, setStops] = useState<OptimizedStopRow[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [totalKm, setTotalKm] = useState(0);
  const [totalMin, setTotalMin] = useState(0);
  const [reorderMode, setReorderMode] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("entregas_pacotes")
        .select("id, numero_pacote, endereco_entrega, lat, lng, ordem_otimizada")
        .eq("oferta_id", ofertaId)
        .order("numero_pacote");
      if (data && data.length > 0) {
        const sorted = [...data].sort(
          (a: any, b: any) => (a.ordem_otimizada ?? a.numero_pacote) - (b.ordem_otimizada ?? b.numero_pacote),
        );
        setStops(
          sorted
            .filter((p: any) => p.endereco_entrega)
            .map((p: any, i: number) => ({
              id: p.id,
              lat: Number(p.lat ?? 0),
              lng: Number(p.lng ?? 0),
              address: p.endereco_entrega,
              ordem: (p.ordem_otimizada ?? i + 1) as number,
            })),
        );
        setAddressesText((data as any[]).map((p) => p.endereco_entrega ?? "").filter(Boolean).join("\n"));
      }
      setLoading(false);
    })();
  }, [ofertaId]);

  async function handleOptimize() {
    const addresses = addressesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (addresses.length === 0) {
      toast.error("Adicione pelo menos um endereço.");
      return;
    }
    setBusy(true);
    setProgress({ done: 0, total: addresses.length });

    // Geocode with progress (sequentially via geocodeMultiple but report progress per item)
    const results: Array<{ address: string; lat: number; lng: number } | null> = [];
    for (let i = 0; i < addresses.length; i++) {
      const r = await geocodeMultiple([addresses[i]]);
      results.push(r[0]);
      setProgress({ done: i + 1, total: addresses.length });
    }

    const validStops: Stop[] = results
      .map((r, i) => (r ? { id: `tmp-${i}`, lat: r.lat, lng: r.lng, address: r.address } : null))
      .filter(Boolean) as Stop[];

    const failed = results.filter((r) => !r).length;
    if (failed > 0) toast.warning(`${failed} endereço(s) não foram geocodificados.`);
    if (validStops.length === 0) {
      setBusy(false);
      setProgress(null);
      toast.error("Nenhum endereço pôde ser geocodificado.");
      return;
    }

    const startPoint = origin ?? { lat: validStops[0].lat, lng: validStops[0].lng };
    const optimized = optimizeRoute(startPoint, validStops);

    setStops(
      optimized.stops.map((s, i) => ({
        ...s,
        ordem: i + 1,
      })),
    );
    setTotalKm(optimized.totalDistanceKm);
    setTotalMin(optimized.estimatedMinutes);
    setProgress(null);
    setBusy(false);
    toast.success("Rota otimizada!");
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = stops.findIndex((s) => s.id === active.id);
    const newIdx = stops.findIndex((s) => s.id === over.id);
    const next = arrayMove(stops, oldIdx, newIdx).map((s, i) => ({ ...s, ordem: i + 1 }));
    setStops(next);
  }

  async function handleSave() {
    if (stops.length === 0) return;
    setBusy(true);
    try {
      // Upsert entregas_pacotes: for any tmp-* IDs, insert; otherwise update
      const tmpStops = stops.filter((s) => s.id.startsWith("tmp-"));
      const realStops = stops.filter((s) => !s.id.startsWith("tmp-"));

      if (tmpStops.length > 0) {
        // Insert new package rows
        const rows = tmpStops.map((s) => ({
          oferta_id: ofertaId,
          numero_pacote: s.ordem,
          endereco_entrega: s.address,
          lat: s.lat,
          lng: s.lng,
          ordem_otimizada: s.ordem,
        }));
        const { data: inserted, error } = await supabase
          .from("entregas_pacotes")
          .insert(rows)
          .select("id, numero_pacote");
        if (error) throw error;
        // map back ids
        (inserted ?? []).forEach((row: any, i: number) => {
          tmpStops[i].id = row.id;
        });
      }

      // Update existing
      for (const s of realStops) {
        await supabase
          .from("entregas_pacotes")
          .update({ ordem_otimizada: s.ordem, lat: s.lat, lng: s.lng, endereco_entrega: s.address })
          .eq("id", s.id);
      }
      for (const s of tmpStops) {
        await supabase
          .from("entregas_pacotes")
          .update({ ordem_otimizada: s.ordem })
          .eq("id", s.id);
      }

      // Upsert rotas_otimizadas: insert new (one per optimization)
      const sequencia = stops.map((s) => ({ pacote_id: s.id, lat: s.lat, lng: s.lng, ordem: s.ordem }));
      const { error: rotaErr } = await supabase.from("rotas_otimizadas").insert({
        oferta_id: ofertaId,
        distancia_total_km: totalKm,
        tempo_total_minutos: totalMin,
        sequencia_otimizada: sequencia as any,
        algoritmo: "nearest_neighbor",
      });
      if (rotaErr) throw rotaErr;

      toast.success("Rota otimizada salva!");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  const mapCenter = useMemo<[number, number]>(() => {
    if (stops.length > 0) return [stops[0].lat, stops[0].lng];
    if (origin) return [origin.lat, origin.lng];
    return [-23.55, -46.63];
  }, [stops, origin]);

  const polyline = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    if (origin) pts.push([origin.lat, origin.lng]);
    stops.forEach((s) => pts.push([s.lat, s.lng]));
    return pts;
  }, [stops, origin]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Otimizar — {rota.nome}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Endereços (um por linha)</label>
              <Textarea
                rows={5}
                value={addressesText}
                onChange={(e) => setAddressesText(e.target.value)}
                placeholder="Rua das Flores 100, São Paulo SP&#10;Av Paulista 1000, São Paulo SP"
                disabled={busy}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleOptimize} disabled={busy}>
                {busy && progress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Geocodificando {progress.done}/{progress.total}...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" /> Otimizar automaticamente
                  </>
                )}
              </Button>
              {stops.length > 0 && (
                <Button variant="outline" onClick={() => setReorderMode((v) => !v)}>
                  <GripVertical className="mr-2 h-4 w-4" />
                  {reorderMode ? "Concluir" : "Reordenar manualmente"}
                </Button>
              )}
            </div>

            {stops.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{stops.length} paradas</Badge>
                  {totalKm > 0 && <Badge variant="secondary">{totalKm.toFixed(1)} km</Badge>}
                  {totalMin > 0 && <Badge variant="secondary">{formatDuration(totalMin)}</Badge>}
                </div>

                <div className="h-72 w-full overflow-hidden rounded-lg border">
                  <MapContainer center={mapCenter} zoom={12} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                      attribution='&copy; OpenStreetMap'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {polyline.length >= 2 && (
                      <Polyline positions={polyline} pathOptions={{ color: ROUTE_COLORS[0], weight: 4 }} />
                    )}
                    {stops.map((s) => (
                      <Marker key={s.id} position={[s.lat, s.lng]}>
                        <Tooltip permanent direction="top" offset={[0, -20]}>
                          {s.ordem}
                        </Tooltip>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>

                <div className="rounded-lg border">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      {stops.map((s) => (
                        <SortableStop key={s.id} stop={s} reorderMode={reorderMode} />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={onClose} disabled={busy}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={busy}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Confirmar e criar
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SortableStop({ stop, reorderMode }: { stop: OptimizedStopRow; reorderMode: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
    disabled: !reorderMode,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 border-b p-2 last:border-b-0"
    >
      {reorderMode && (
        <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
        {stop.ordem}
      </div>
      <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-sm">{stop.address}</span>
    </div>
  );
}
